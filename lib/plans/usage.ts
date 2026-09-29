import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';

export interface TenantResourceUsage {
  product_used: number;
  product_limit: number;
  order_used: number;
  order_limit: number;
  storage_used_bytes: number;
  storage_limit_bytes: number;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function getBytesFromStorage(
  bucket: string,
  paths: string[]
): Promise<number> {
  if (paths.length === 0) {
    return 0;
  }

  const supabase = createServiceClient();
  const sizes = await Promise.all(
    paths.map(async (path) => {
      try {
        const { data: info, error: infoError } = await supabase.storage
          .from(bucket)
          .info(path);

        if (infoError || !info) {
          return 0;
        }

        const size = (info as { size?: number }).size;
        if (typeof size === 'number' && size > 0) {
          return size;
        }
        return 0;
      } catch {
        return 0;
      }
    })
  );

  return sizes.reduce((sum, size) => sum + size, 0);
}

export async function getTenantResourceUsage(tenantId: string): Promise<TenantResourceUsage> {
  const supabase = await createClient();

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('plan_id')
    .eq('id', tenantId)
    .single();

  if (tenantError || !tenant) {
    throw new Error(tenantError?.message ?? 'Tenant not found');
  }

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('product_limit, order_limit, storage_limit_bytes')
    .eq('id', tenant.plan_id)
    .single();

  if (planError || !plan) {
    throw new Error(planError?.message ?? 'Plan not found');
  }

  const [
    activeProductsResult,
    totalOrdersResult,
    productImageRows,
    storeAssetRows,
  ] = await Promise.all([
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('is_archived', false),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase
      .from('product_images')
      .select('storage_path')
      .eq('tenant_id', tenantId),
    supabase
      .from('store_assets')
      .select('storage_path')
      .eq('tenant_id', tenantId),
  ]);

  const productImagePaths = (productImageRows.data ?? [])
    .map((row) => row.storage_path)
    .filter((path): path is string => typeof path === 'string' && path.length > 0);

  const storeAssetPaths = (storeAssetRows.data ?? [])
    .map((row) => row.storage_path)
    .filter((path): path is string => typeof path === 'string' && path.length > 0);

  const [productImageStorageBytes, storeAssetStorageBytes] = await Promise.all([
    getBytesFromStorage('product-images', productImagePaths),
    getBytesFromStorage('store-assets', storeAssetPaths),
  ]);

  return {
    product_used: activeProductsResult.count ?? 0,
    product_limit: plan.product_limit,
    order_used: totalOrdersResult.count ?? 0,
    order_limit: plan.order_limit,
    storage_used_bytes: productImageStorageBytes + storeAssetStorageBytes,
    storage_limit_bytes: plan.storage_limit_bytes,
  };
}
