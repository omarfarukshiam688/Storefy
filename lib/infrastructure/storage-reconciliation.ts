import 'server-only';

import { createServiceClient } from '@/lib/supabase/admin';

export type ReconciliationRunResult = {
  ok: boolean;
  runId?: string;
  idempotent?: boolean;
  status?: string;
  error?: string;
  errorCode?: string;
  lockToken?: string;
  leaseExpiresAt?: string;
  stats?: {
    objectsScanned: number;
    tenantsScanned: number;
    totalActualBytes: number;
    totalInternalBytes: number;
    discrepancyCount: number;
    orphanObjectCount: number;
    missingObjectCount: number;
  };
};

type StorageObjectRow = {
  id?: string;
  bucket_id: string;
  name: string;
  metadata?: { size?: number | string } | null;
};

function parseTenantIdFromPath(name: string): string | null {
  const m = /^tenant\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i.exec(name);
  return m?.[1] ?? null;
}

function objectSize(obj: StorageObjectRow): number {
  const raw = obj.metadata?.size;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return Math.floor(raw);
  throw new Error(
    `Storage object ${obj.name} (${obj.id ?? 'unknown'}) has invalid or missing size metadata`
  );
}

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // renew every 2 minutes

async function listBucketObjectsRecursive(
  supabase: ReturnType<typeof createServiceClient>,
  bucketId: string,
  folderPath: string
): Promise<StorageObjectRow[]> {
  const out: StorageObjectRow[] = [];
  const pageSize = 1000;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage.from(bucketId).list(folderPath, {
      limit: pageSize,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error)
      throw new Error(
        `Failed to list storage objects in ${bucketId}/${folderPath || ''}: ${error.message}`
      );

    const items = data ?? [];

    for (const item of items) {
      const fullPath = folderPath ? `${folderPath}/${item.name}` : item.name;

      // Supabase Storage API discriminator: item.id === null means folder,
      // item.id !== null (a UUID string) means file.
      if (item.id === null) {
        // It's a folder - recurse into it to find nested objects
        const folderObjects = await listBucketObjectsRecursive(supabase, bucketId, fullPath);
        out.push(...folderObjects);
      } else {
        // It's a file - require valid size metadata
        const metadata = item.metadata;
        const rawSize = metadata?.size;

        if (typeof rawSize !== 'number' || !Number.isFinite(rawSize) || rawSize < 0) {
          throw new Error(
            `File ${fullPath} in bucket ${bucketId} has invalid or missing size metadata: ${JSON.stringify(
              rawSize
            )}`
          );
        }

        out.push({
          id: item.id,
          bucket_id: bucketId,
          name: fullPath,
          metadata: { size: rawSize },
        });
      }
    }

    if (items.length < pageSize) break;
    offset += pageSize;
  }

  return out;
}

async function fetchAllBucketObjects(bucketId: string): Promise<StorageObjectRow[]> {
  const supabase = createServiceClient();
  return listBucketObjectsRecursive(supabase, bucketId, '');
}

async function renewLease(
  supabase: ReturnType<typeof createServiceClient>,
  runId: string,
  lockToken: string
): Promise<{ ok: boolean; error?: string; errorCode?: string }> {
  const { data, error } = await supabase.rpc('renew_storage_reconciliation_lease', {
    p_run_id: runId,
    p_lock_token: lockToken,
  });
  if (error) {
    return { ok: false, error: error.message, errorCode: 'LEASE_RENEW_RPC_ERROR' };
  }
  const res = (data ?? {}) as { success?: boolean; error_code?: string; error?: string };
  if (!res.success) {
    return { ok: false, error: res.error ?? 'Lease renewal failed', errorCode: res.error_code };
  }
  return { ok: true };
}

export async function runStorageReconciliation(input?: {
  triggerSource?: 'scheduled' | 'manual' | 'api' | 'repair';
  scheduledFor?: string; // YYYY-MM-DD (Dhaka schedule date)
}): Promise<ReconciliationRunResult> {
  const supabase = createServiceClient();
  const triggerSource = input?.triggerSource ?? 'manual';
  const scheduledFor = input?.scheduledFor ?? null;

  // Start the run with persistent lock. The RPC returns lock_token and lease_expires_at.
  const { data: startData, error: startError } = await supabase.rpc('start_storage_reconciliation_run', {
    p_trigger_source: triggerSource,
    p_scheduled_for: scheduledFor,
  });
  if (startError) {
    return { ok: false, error: startError.message, errorCode: 'START_RPC_ERROR' };
  }
  const start = (startData ?? {}) as {
    success?: boolean;
    run_id?: string;
    idempotent?: boolean;
    status?: string;
    error?: string;
    error_code?: string;
    lock_token?: string;
    lease_expires_at?: string;
  };
  if (!start.success) {
    return {
      ok: false,
      runId: start.run_id,
      idempotent: start.idempotent,
      status: start.status,
      error: start.error ?? 'Failed to start reconciliation',
      errorCode: start.error_code,
      lockToken: start.lock_token,
      leaseExpiresAt: start.lease_expires_at,
    };
  }
  if (start.idempotent && start.status === 'already_exists') {
    return { ok: true, runId: start.run_id, idempotent: true, status: start.status };
  }
  if (start.error_code === 'ALREADY_RUNNING') {
    return {
      ok: false,
      runId: start.run_id,
      status: start.status,
      error: start.error,
      errorCode: 'ALREADY_RUNNING',
      lockToken: start.lock_token,
      leaseExpiresAt: start.lease_expires_at,
    };
  }
  const runId = start.run_id as string;
  const lockToken = start.lock_token as string;

  // --- Ownership fencing state ---
  let ownershipLost = false;
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let heartbeatInProgress = false;

  // Helper: verify we still own the lock before any write stage
  function assertOwnership(): void {
    if (ownershipLost) {
      throw new Error('Reconciliation run lost lock ownership — lease renewal failed');
    }
  }

  // Start heartbeat: renew lease every 2 minutes
  function startHeartbeat(): void {
    heartbeatTimer = setInterval(async () => {
      if (heartbeatInProgress || ownershipLost) return;
      heartbeatInProgress = true;
      try {
        const result = await renewLease(supabase, runId, lockToken);
        if (!result.ok) {
          // Lease renewal failure is NOT a harmless warning — we lost ownership
          ownershipLost = true;
          console.error(`Reconciliation run ${runId} lost lock ownership: ${result.error}`);
        }
      } catch (e) {
        ownershipLost = true;
        console.error(`Reconciliation run ${runId} heartbeat exception:`, e);
      } finally {
        heartbeatInProgress = false;
      }
    }, HEARTBEAT_INTERVAL_MS);
    // Unref so the timer doesn't prevent process exit
    if (heartbeatTimer) heartbeatTimer.unref?.();
  }

  function stopHeartbeat(): void {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  startHeartbeat();

  let objectsScanned = 0;
  let totalActualBytes = 0;
  let totalInternalBytes = 0;
  let tenantsScanned = 0;
  let discrepancyCount = 0;
  let orphanObjectCount = 0;
  let missingObjectCount = 0;

  try {
    assertOwnership();

    const [productObjects, storeObjects] = await Promise.all([
      fetchAllBucketObjects('product-images'),
      fetchAllBucketObjects('store-assets'),
    ]);
    const allObjects = [...productObjects, ...storeObjects];
    objectsScanned = allObjects.length;

    assertOwnership();

    const actualByTenant = new Map<string, number>();
    const actualPathsByBucket = new Map<string, Set<string>>();
    actualPathsByBucket.set('product-images', new Set());
    actualPathsByBucket.set('store-assets', new Set());

    const discrepancies: Array<{
      tenant_id: string | null;
      bucket_id: string | null;
      storage_path: string | null;
      discrepancy_type: string;
      internal_bytes?: number | null;
      actual_bytes?: number | null;
      delta_bytes?: number | null;
      details?: Record<string, unknown>;
    }> = [];

    for (const obj of allObjects) {
      actualPathsByBucket.get(obj.bucket_id)?.add(obj.name);
      const tenantId = parseTenantIdFromPath(obj.name);
      const size = objectSize(obj);
      totalActualBytes += size;
      if (!tenantId) {
        discrepancies.push({
          tenant_id: null,
          bucket_id: obj.bucket_id,
          storage_path: obj.name,
          discrepancy_type: 'tenant_unmapped',
          actual_bytes: size,
          details: { reason: 'Could not parse tenant id from storage path' },
        });
        continue;
      }
      actualByTenant.set(tenantId, (actualByTenant.get(tenantId) ?? 0) + size);
    }

    assertOwnership();

    // Known DB records (authoritative mapping for tenant-owned tracked assets)
    const [{ data: productRows, error: productErr }, { data: storeRows, error: storeErr }] = await Promise.all([
      supabase.from('product_images').select('tenant_id,storage_path,file_size'),
      supabase.from('store_assets').select('tenant_id,storage_path,file_size'),
    ]);
    if (productErr) throw new Error(`Failed to read product_images: ${productErr.message}`);
    if (storeErr) throw new Error(`Failed to read store_assets: ${storeErr.message}`);

    const dbByTenant = new Map<string, { paths: Set<string>; bytes: number }>();
    const dbPathsByBucket = new Map<string, Set<string>>();
    dbPathsByBucket.set('product-images', new Set());
    dbPathsByBucket.set('store-assets', new Set());

    for (const row of (productRows ?? []) as Array<{ tenant_id: string; storage_path: string; file_size: number }>) {
      const t = row.tenant_id;
      if (!dbByTenant.has(t)) dbByTenant.set(t, { paths: new Set(), bytes: 0 });
      const entry = dbByTenant.get(t)!;
      entry.paths.add(row.storage_path);
      entry.bytes += Math.max(0, Number(row.file_size) || 0);
      dbPathsByBucket.get('product-images')!.add(row.storage_path);
    }
    for (const row of (storeRows ?? []) as Array<{ tenant_id: string; storage_path: string; file_size: number }>) {
      const t = row.tenant_id;
      if (!dbByTenant.has(t)) dbByTenant.set(t, { paths: new Set(), bytes: 0 });
      const entry = dbByTenant.get(t)!;
      entry.paths.add(row.storage_path);
      entry.bytes += Math.max(0, Number(row.file_size) || 0);
      dbPathsByBucket.get('store-assets')!.add(row.storage_path);
    }

    // Orphans: in storage but no DB record (tracked buckets only)
    for (const bucket of ['product-images', 'store-assets'] as const) {
      const actualSet = actualPathsByBucket.get(bucket)!;
      const dbSet = dbPathsByBucket.get(bucket)!;
      for (const path of actualSet) {
        if (!dbSet.has(path)) {
          orphanObjectCount++;
          const tenantId = parseTenantIdFromPath(path);
          discrepancies.push({
            tenant_id: tenantId,
            bucket_id: bucket,
            storage_path: path,
            discrepancy_type: 'orphan_object',
            details: { reason: 'Storage object exists without corresponding application record' },
          });
        }
      }
    }
    // Missing: DB record but object absent in storage
    for (const bucket of ['product-images', 'store-assets'] as const) {
      const actualSet = actualPathsByBucket.get(bucket)!;
      const dbSet = dbPathsByBucket.get(bucket)!;
      for (const path of dbSet) {
        if (!actualSet.has(path)) {
          missingObjectCount++;
          const tenantId = parseTenantIdFromPath(path);
          discrepancies.push({
            tenant_id: tenantId,
            bucket_id: bucket,
            storage_path: path,
            discrepancy_type: 'missing_object',
            details: { reason: 'Application record exists but storage object is missing' },
          });
        }
      }
    }

    assertOwnership();

    // Load current internal usage counters (read-only, never overwritten by reconciliation)
    const { data: usageRows } = await supabase
      .from('tenant_storage_usage')
      .select('tenant_id,internal_usage_bytes,actual_usage_bytes');
    const internalCounterByTenant = new Map<string, { internal: number; actual: number | null }>();
    for (const row of (usageRows ?? []) as Array<{
      tenant_id: string;
      internal_usage_bytes: number;
      actual_usage_bytes: number | null;
    }>) {
      internalCounterByTenant.set(row.tenant_id, {
        internal: Math.max(0, Number(row.internal_usage_bytes) || 0),
        actual: row.actual_usage_bytes != null ? Math.max(0, Number(row.actual_usage_bytes) || 0) : null,
      });
    }

    const tenantIds = new Set<string>([...actualByTenant.keys(), ...dbByTenant.keys(), ...internalCounterByTenant.keys()]);
    tenantsScanned = tenantIds.size;

    const nowIso = new Date().toISOString();

    // Reconciliation records ACTUAL usage independently. Internal counter is managed
    // atomically by upload/delete/replace operations and must NOT be overwritten here.
    for (const tenantId of tenantIds) {
      assertOwnership();

      const actual = actualByTenant.get(tenantId) ?? 0;
      const counter = internalCounterByTenant.get(tenantId);
      const internalFromCounter = counter?.internal ?? null;
      const internalFromRecords = dbByTenant.get(tenantId)?.bytes ?? 0;
      const internal = internalFromCounter ?? internalFromRecords;
      totalInternalBytes += internal;

      const delta = internal - actual;
      if (delta !== 0) {
        discrepancyCount++;
        discrepancies.push({
          tenant_id: tenantId,
          bucket_id: null,
          storage_path: null,
          discrepancy_type: 'internal_mismatch',
          internal_bytes: internal,
          actual_bytes: actual,
          delta_bytes: delta,
          details: { internal_source: internalFromCounter != null ? 'counter' : 'db_file_size_sum' },
        });
      }

      // Upsert tenant usage: update ACTUAL (reconciled) and status fields only.
      // internal_usage_bytes is intentionally NOT touched here to avoid lost updates
      // from concurrent upload/delete operations.
      const { error: upsertErr } = await supabase
        .from('tenant_storage_usage')
        .upsert(
          {
            tenant_id: tenantId,
            actual_usage_bytes: actual,
            actual_status: 'ok',
            last_reconciled_at: nowIso,
            reconciliation_status: 'ok',
            last_reconciliation_run_id: runId,
            updated_at: nowIso,
          },
          { onConflict: 'tenant_id' }
        );
      if (upsertErr) {
        discrepancies.push({
          tenant_id: tenantId,
          bucket_id: null,
          storage_path: null,
          discrepancy_type: 'scan_error',
          details: { reason: `Failed to upsert tenant_storage_usage: ${upsertErr.message}` },
        });
      }
    }

    assertOwnership();

    // Persist discrepancy records (best-effort, capped)
    const discrepancySlice = discrepancies.slice(0, 2000).map((d) => ({ ...d, run_id: runId }));
    if (discrepancySlice.length > 0) {
      const { error: discErr } = await supabase.from('storage_reconciliation_discrepancies').insert(discrepancySlice);
      if (discErr) {
        discrepancies.push({
          tenant_id: null,
          bucket_id: null,
          storage_path: null,
          discrepancy_type: 'scan_error',
          details: { reason: `Failed to insert discrepancies: ${discErr.message}` },
        });
      }
    }

    assertOwnership();

    // Snapshot (global storage actual)
    const today = new Date().toISOString().slice(0, 10);
    const { error: snapErr } = await supabase.from('infrastructure_usage_snapshots').upsert(
      {
        snapshot_date: today,
        metric_type: 'storage_total',
        scope: 'global',
        tenant_id: null,
        object_name: null,
        value_bytes: totalActualBytes,
        secondary_value_bytes: totalInternalBytes,
        source: 'reconciled',
        accuracy: 'DERIVED',
        status: 'ok',
        metadata: { run_id: runId, objects_scanned: objectsScanned },
        measured_at: nowIso,
      },
      { onConflict: 'snapshot_date,metric_type,scope,tenant_id,object_name' as never }
    );
    if (snapErr) {
      discrepancies.push({
        tenant_id: null,
        bucket_id: null,
        storage_path: null,
        discrepancy_type: 'scan_error',
        details: { reason: `Failed to write snapshot: ${snapErr.message}` },
      });
    }

    const stats = {
      objectsScanned,
      tenantsScanned,
      totalActualBytes,
      totalInternalBytes,
      discrepancyCount: discrepancyCount + orphanObjectCount + missingObjectCount,
      orphanObjectCount,
      missingObjectCount,
    };

    assertOwnership();

    // Stop heartbeat before completing — no more renewals needed
    stopHeartbeat();

    // Complete the run, presenting the lock token so the RPC verifies ownership
    const { error: completeError } = await supabase.rpc('complete_storage_reconciliation_run', {
      p_run_id: runId,
      p_status: 'succeeded',
      p_total_objects_scanned: objectsScanned,
      p_total_actual_bytes: totalActualBytes,
      p_total_internal_bytes: totalInternalBytes,
      p_tenants_scanned: tenantsScanned,
      p_discrepancy_count: stats.discrepancyCount,
      p_orphan_object_count: orphanObjectCount,
      p_missing_object_count: missingObjectCount,
      p_error_code: null,
      p_error_message: null,
      p_details: { trigger_source: triggerSource },
      p_lock_token: lockToken,
    });
    if (completeError) {
      throw new Error(`Failed to complete reconciliation run: ${completeError.message}`);
    }

    return { ok: true, runId, status: 'succeeded', lockToken, stats };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Reconciliation failed';

    // Stop heartbeat immediately on failure
    stopHeartbeat();

    // Attempt to mark the run as failed, releasing the lock.
    // Only attempt completion if we still own the lock (ownershipLost === false).
    // If ownership was lost, do NOT attempt to complete — the new owner will handle it.
    if (!ownershipLost) {
      try {
        await supabase.rpc('complete_storage_reconciliation_run', {
          p_run_id: runId,
          p_status: 'failed',
          p_total_objects_scanned: objectsScanned,
          p_total_actual_bytes: totalActualBytes || null,
          p_total_internal_bytes: totalInternalBytes || null,
          p_tenants_scanned: tenantsScanned,
          p_discrepancy_count: discrepancyCount,
          p_orphan_object_count: orphanObjectCount,
          p_missing_object_count: missingObjectCount,
          p_error_code: 'RECONCILIATION_ERROR',
          p_error_message: msg,
          p_details: {},
          p_lock_token: lockToken,
        });
      } catch {
        // If completion fails, the lease will expire automatically (10-minute TTL)
        // allowing a future run to recover the stale lock.
      }
    }

    return { ok: false, runId, status: 'failed', error: msg, errorCode: 'RECONCILIATION_ERROR', lockToken };
  } finally {
    // Ensure heartbeat is always stopped
    stopHeartbeat();
  }
}
