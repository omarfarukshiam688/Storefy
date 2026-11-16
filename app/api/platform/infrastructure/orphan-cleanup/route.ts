import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { createServiceClient } from '@/lib/supabase/admin';
import { cleanupOrphanedStoreAssets } from '@/lib/infrastructure/orphan-cleanup';

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const body = await req.json().catch(() => ({} as { dryRun?: boolean }));
    const dryRun = body.dryRun === true;

    if (dryRun) {
      // Dry run: list orphans without deleting.
      // Uses the same eligibility checks as the execute path so results are consistent.
      const supabase = createServiceClient();

      const [productObjects, storeObjects] = await Promise.all([
        supabase.schema('storage').from('objects').select('id,bucket_id,name,created_at,metadata').eq('bucket_id', 'product-images'),
        supabase.schema('storage').from('objects').select('id,bucket_id,name,created_at,metadata').eq('bucket_id', 'store-assets'),
      ]);

      const allObjects = [
        ...((productObjects.data ?? []) as Array<{ bucket_id: string; name: string; created_at?: string | null }>),
        ...((storeObjects.data ?? []) as Array<{ bucket_id: string; name: string; created_at?: string | null }>),
      ];

      const [{ data: productRows }, { data: storeRows }] = await Promise.all([
        supabase.from('product_images').select('storage_path'),
        supabase.from('store_assets').select('storage_path'),
      ]);

      const dbPaths = new Set<string>();
      for (const row of (productRows ?? []) as Array<{ storage_path: string }>) dbPaths.add(row.storage_path);
      for (const row of (storeRows ?? []) as Array<{ storage_path: string }>) dbPaths.add(row.storage_path);

      // Build set of all tenant settings-referenced paths (storefront references)
      const { data: tenantRows } = await supabase.from('tenants').select('id, settings');
      const settingsPaths = new Set<string>();
      for (const row of (tenantRows ?? []) as Array<{ settings: Record<string, unknown> | null }>) {
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

      // Build set of active reservations (block cleanup)
      const { data: reservationRows } = await supabase
        .from('storage_upload_reservations')
        .select('storage_path')
        .eq('status', 'reserved')
        .gt('expires_at', new Date().toISOString());
      const reservedPaths = new Set<string>();
      for (const row of (reservationRows ?? []) as Array<{ storage_path: string }>) {
        reservedPaths.add(row.storage_path);
      }

      const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;

      const orphanCandidates = allObjects.filter((obj) => {
        const m = /^tenant\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i.exec(obj.name);
        if (!m) return false;
        if (dbPaths.has(obj.name)) return false;
        if (settingsPaths.has(obj.name)) return false;
        if (reservedPaths.has(obj.name)) return false;
        const createdAt = obj.created_at ? new Date(obj.created_at).getTime() : null;
        if (createdAt != null && createdAt > cutoffMs) return false;
        return true;
      });

      return NextResponse.json({
        ok: true,
        dryRun: true,
        scanned: allObjects.length,
        orphanCandidates: orphanCandidates.length,
        orphans: orphanCandidates.map((o) => ({ storage_path: o.name, bucket_id: o.bucket_id, created_at: o.created_at })),
      });
    }

    const result = await cleanupOrphanedStoreAssets();
    const status = result.ok ? 200 : 207; // 207 Multi-Status if some deletions failed
    return NextResponse.json(result, { status });
  } catch (error) {
    console.error('Orphan cleanup error:', error);
    const msg = error instanceof Error ? error.message : 'Orphan cleanup failed';
    const status = msg.includes('Super admin') ? 403 : msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
