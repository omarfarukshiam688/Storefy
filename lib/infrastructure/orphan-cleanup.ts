import 'server-only';

import { createServiceClient } from '@/lib/supabase/admin';

export type OrphanCleanupResult = {
  ok: boolean;
  scanned: number;
  orphanCandidates: number;
  eligibleForCleanup: number;
  cleanedUp: number;
  skipped: Array<{ storage_path: string; reason: string }>;
  deleted: Array<{ storage_path: string; tenant_id: string | null }>;
  errors: Array<{ storage_path: string; error: string }>;
};

type StorageObjectRow = {
  id?: string;
  bucket_id: string;
  name: string;
  created_at?: string | null;
  metadata?: { size?: number | string } | null;
};

function parseTenantIdFromPath(name: string): string | null {
  const m = /^tenant\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i.exec(name);
  return m?.[1] ?? null;
}

// Conservative grace period: only clean up objects older than 24 hours
const ORPHAN_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

async function fetchAllBucketObjectsWithDates(bucketId: string): Promise<StorageObjectRow[]> {
  const supabase = createServiceClient();
  const out: StorageObjectRow[] = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .schema('storage')
      .from('objects')
      .select('id,bucket_id,name,created_at,metadata')
      .eq('bucket_id', bucketId)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Failed to scan storage.objects for ${bucketId}: ${error.message}`);
    const rows = (data ?? []) as StorageObjectRow[];
    out.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

export async function cleanupOrphanedStoreAssets(): Promise<OrphanCleanupResult> {
  const supabase = createServiceClient();
  const result: OrphanCleanupResult = {
    ok: true,
    scanned: 0,
    orphanCandidates: 0,
    eligibleForCleanup: 0,
    cleanedUp: 0,
    skipped: [],
    deleted: [],
    errors: [],
  };

  try {
    // 1. Scan storage objects from both tracked buckets
    const [productObjects, storeObjects] = await Promise.all([
      fetchAllBucketObjectsWithDates('product-images'),
      fetchAllBucketObjectsWithDates('store-assets'),
    ]);
    const allObjects = [...productObjects, ...storeObjects];
    result.scanned = allObjects.length;

    // 2. Build set of all DB-referenced storage paths
    const [{ data: productRows }, { data: storeRows }] = await Promise.all([
      supabase.from('product_images').select('storage_path'),
      supabase.from('store_assets').select('storage_path'),
    ]);

    const dbPaths = new Set<string>();
    for (const row of (productRows ?? []) as Array<{ storage_path: string }>) {
      dbPaths.add(row.storage_path);
    }
    for (const row of (storeRows ?? []) as Array<{ storage_path: string }>) {
      dbPaths.add(row.storage_path);
    }

    // 3. Build set of all tenant settings-referenced paths (storefront references)
    const { data: tenantRows } = await supabase.from('tenants').select('id, settings');
    const settingsPaths = new Set<string>();
    for (const row of (tenantRows ?? []) as Array<{ id: string; settings: Record<string, unknown> | null }>) {
      const settings = row.settings ?? {};
      const walk = (val: unknown): void => {
        if (typeof val === 'string') {
          settingsPaths.add(val);
        } else if (Array.isArray(val)) {
          val.forEach(walk);
        } else if (val && typeof val === 'object') {
          Object.values(val).forEach(walk);
        }
      };
      walk(settings);
    }

    // 4. Build set of active reservations (block cleanup)
    const { data: reservationRows } = await supabase
      .from('storage_upload_reservations')
      .select('storage_path')
      .eq('status', 'reserved')
      .gt('expires_at', new Date().toISOString());
    const reservedPaths = new Set<string>();
    for (const row of (reservationRows ?? []) as Array<{ storage_path: string }>) {
      reservedPaths.add(row.storage_path);
    }

    // 5. Grace period cutoff
    const cutoffMs = Date.now() - ORPHAN_GRACE_PERIOD_MS;

    // 6. Evaluate each orphan candidate
    for (const obj of allObjects) {
      // Must be in a tracked bucket with a recognizable tenant path
      const tenantId = parseTenantIdFromPath(obj.name);
      if (!tenantId) {
        result.skipped.push({ storage_path: obj.name, reason: 'not a tenant path' });
        continue;
      }

      // Must not have a DB record
      if (dbPaths.has(obj.name)) {
        result.skipped.push({ storage_path: obj.name, reason: 'has DB record' });
        continue;
      }

      // Must not be referenced in tenant settings (storefront usage)
      if (settingsPaths.has(obj.name)) {
        result.skipped.push({ storage_path: obj.name, reason: 'referenced in tenant settings' });
        continue;
      }

      // Must not have an active reservation
      if (reservedPaths.has(obj.name)) {
        result.skipped.push({ storage_path: obj.name, reason: 'active reservation' });
        continue;
      }

      // Must be older than grace period
      const createdAt = obj.created_at ? new Date(obj.created_at).getTime() : null;
      if (createdAt != null && createdAt > cutoffMs) {
        result.skipped.push({ storage_path: obj.name, reason: 'within grace period' });
        continue;
      }

      result.orphanCandidates++;
      result.eligibleForCleanup++;

      // Attempt deletion
      try {
        const { error: deleteError } = await supabase.storage.from(obj.bucket_id).remove([obj.name]);
        if (deleteError) {
          result.errors.push({ storage_path: obj.name, error: deleteError.message });
          result.skipped.push({ storage_path: obj.name, reason: `storage delete failed: ${deleteError.message}` });
        } else {
          result.cleanedUp++;
          result.deleted.push({ storage_path: obj.name, tenant_id: tenantId });
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'unknown error';
        result.errors.push({ storage_path: obj.name, error: errMsg });
        result.skipped.push({ storage_path: obj.name, reason: `exception: ${errMsg}` });
      }
    }

    if (result.errors.length > 0) {
      result.ok = false;
    }
  } catch (e) {
    result.ok = false;
    result.errors.push({ storage_path: '*', error: e instanceof Error ? e.message : 'cleanup failed' });
  }

  return result;
}
