import 'server-only';

import { createServiceClient } from '@/lib/supabase/admin';

type StorageObjectRow = {
  bucket_id: string;
  name: string;
  metadata?: { size?: number | string } | null;
};

export function parseTenantIdFromPath(name: string): string | null {
  const m = /^tenant\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i.exec(name);
  return m?.[1] ?? null;
}

export function objectSize(obj: StorageObjectRow): number {
  const raw = obj.metadata?.size;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return Math.floor(raw);
  throw new Error(
    `Storage object ${obj.name} (unknown) has invalid or missing size metadata`
  );
}

function normalizeStoragePath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return null;
  if (trimmed.includes('..') || trimmed.includes('\\')) return null;
  return trimmed;
}

function addPath(map: Map<string, Set<string>>, tenantId: string, path: string): void {
  let set = map.get(tenantId);
  if (!set) {
    set = new Set();
    map.set(tenantId, set);
  }
  set.add(path);
}

export async function listBucketObjectsRecursive(
  supabase: ReturnType<typeof createServiceClient>,
  bucketId: string,
  folderPath: string | undefined
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
      if (item.id === null) {
        const folderObjects = await listBucketObjectsRecursive(supabase, bucketId, fullPath);
        out.push(...folderObjects);
      } else {
        const rawSize = item.metadata?.size;
        if (typeof rawSize !== 'number' || !Number.isFinite(rawSize) || rawSize < 0) {
          throw new Error(
            `File ${fullPath} in bucket ${bucketId} has invalid or missing size metadata: ${JSON.stringify(
              rawSize
            )}`
          );
        }
        out.push({
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

function collectSectionConfigPaths(
  sections: Array<{ tenant_id: string; section_key: string; config: Record<string, unknown> }>
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const row of sections) {
    const config = row.config ?? {};
    if (row.section_key === 'hero') {
      const p = normalizeStoragePath(config.image_path);
      if (p) addPath(out, row.tenant_id, p);
    }
    if (row.section_key === 'about_us') {
      const p = normalizeStoragePath(config.image_path);
      if (p) addPath(out, row.tenant_id, p);
    }
  }
  return out;
}

function collectTenantSettingsPaths(
  tenants: Array<{ id: string; settings: Record<string, unknown> }>
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const t of tenants) {
    const settings = t.settings ?? {};
    const logo = normalizeStoragePath(settings.logo_url);
    if (logo) addPath(out, t.id, logo);
    const favicon = normalizeStoragePath(settings.favicon_url);
    if (favicon) addPath(out, t.id, favicon);
  }
  return out;
}

export type TenantInternalUsage = {
  trackedBytes: number;
  referencedUntrackedBytes: number;
  calculatedBytes: number;
};

export type InternalUsageCalculation = {
  byTenant: Map<string, TenantInternalUsage>;
  dbPathsByBucket: Map<string, Set<string>>;
  referencedPaths: Set<string>;
};

/**
 * Read-only calculation of internal storage usage per tenant.
 *
 * calculatedBytes = tracked DB record bytes (product_images + store_assets)
 *   + referenced-but-untracked branding asset bytes (hero/about config image_path,
 *   logo/favicon settings) whose sizes come from storage.
 *
 * Does not write to the database and does not touch the persisted
 * internal_usage_bytes counter. The persisted counter and this calculated
 * value are intentionally distinct.
 */
export async function getCalculatedInternalUsageByTenant(): Promise<InternalUsageCalculation> {
  const supabase = createServiceClient();

  const [
    { data: productRows, error: productErr },
    { data: storeRows, error: storeErr },
    { data: sectionRows, error: sectionErr },
    { data: tenantRows, error: tenantErr },
  ] = await Promise.all([
    supabase.from('product_images').select('tenant_id,storage_path,file_size'),
    supabase.from('store_assets').select('tenant_id,storage_path,file_size'),
    supabase.from('tenant_storefront_sections').select('tenant_id,section_key,config'),
    supabase.from('tenants').select('id,settings'),
  ]);
  if (productErr) throw new Error(`Failed to read product_images: ${productErr.message}`);
  if (storeErr) throw new Error(`Failed to read store_assets: ${storeErr.message}`);
  if (sectionErr) throw new Error(`Failed to read tenant_storefront_sections: ${sectionErr.message}`);
  if (tenantErr) throw new Error(`Failed to read tenants: ${tenantErr.message}`);

  const byTenant = new Map<string, TenantInternalUsage>();
  const dbPathsByBucket = new Map<string, Set<string>>();
  dbPathsByBucket.set('product-images', new Set());
  dbPathsByBucket.set('store-assets', new Set());

  const ensureEntry = (t: string) => {
    if (!byTenant.has(t)) byTenant.set(t, { trackedBytes: 0, referencedUntrackedBytes: 0, calculatedBytes: 0 });
    return byTenant.get(t)!;
  };

  for (const row of (productRows ?? []) as Array<{ tenant_id: string; storage_path: string; file_size: number }>) {
    const entry = ensureEntry(row.tenant_id);
    entry.trackedBytes += Math.max(0, Number(row.file_size) || 0);
    entry.calculatedBytes = entry.trackedBytes + entry.referencedUntrackedBytes;
    dbPathsByBucket.get('product-images')!.add(row.storage_path);
  }
  for (const row of (storeRows ?? []) as Array<{ tenant_id: string; storage_path: string; file_size: number }>) {
    const entry = ensureEntry(row.tenant_id);
    entry.trackedBytes += Math.max(0, Number(row.file_size) || 0);
    entry.calculatedBytes = entry.trackedBytes + entry.referencedUntrackedBytes;
    dbPathsByBucket.get('store-assets')!.add(row.storage_path);
  }

  const sectionConfigPaths = collectSectionConfigPaths(
    (sectionRows ?? []) as Array<{ tenant_id: string; section_key: string; config: Record<string, unknown> }>
  );
  const tenantSettingsPaths = collectTenantSettingsPaths(
    (tenantRows ?? []) as Array<{ id: string; settings: Record<string, unknown> }>
  );

  const referencedPaths = new Set<string>();
  for (const paths of sectionConfigPaths.values()) {
    for (const path of paths) referencedPaths.add(path);
  }
  for (const paths of tenantSettingsPaths.values()) {
    for (const path of paths) referencedPaths.add(path);
  }

  // Scan store-assets storage for referenced-but-untracked sizes
  let storeObjects: StorageObjectRow[];
  try {
    storeObjects = await listBucketObjectsRecursive(supabase, 'store-assets', undefined);
  } catch {
    // Storage listing failure is non-fatal: return tracked DB bytes only,
    // without referenced-but-untracked branding asset sizes.
    return { byTenant, dbPathsByBucket, referencedPaths };
  }
  const storeObjectSize = new Map<string, number>();
  for (const obj of storeObjects) storeObjectSize.set(obj.name, objectSize(obj));

  const trackedStorePaths = new Set<string>();
  for (const row of (storeRows ?? []) as Array<{ storage_path: string }>) {
    trackedStorePaths.add(row.storage_path);
  }

  for (const path of referencedPaths) {
    const size = storeObjectSize.get(path);
    if (size == null) continue;
    if (trackedStorePaths.has(path)) continue; // already tracked — avoid double counting
    const tenantId = parseTenantIdFromPath(path);
    if (!tenantId) continue;
    const entry = ensureEntry(tenantId);
    entry.referencedUntrackedBytes += size;
    entry.calculatedBytes = entry.trackedBytes + entry.referencedUntrackedBytes;
  }

  return { byTenant, dbPathsByBucket, referencedPaths };
}
