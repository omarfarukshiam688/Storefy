import { createClient } from '@/lib/supabase/server';

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
    productImagesResult,
    storeAssetsResult,
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
      .select('file_size')
      .eq('tenant_id', tenantId),
    supabase
      .from('store_assets')
      .select('file_size')
      .eq('tenant_id', tenantId),
  ]);

  let productImageBytes = 0;
  if (!productImagesResult.error && productImagesResult.data) {
    for (const row of productImagesResult.data) {
      productImageBytes += row.file_size;
    }
  }

  let storeAssetBytes = 0;
  if (!storeAssetsResult.error && storeAssetsResult.data) {
    for (const row of storeAssetsResult.data) {
      storeAssetBytes += row.file_size;
    }
  }

  return {
    product_used: activeProductsResult.count ?? 0,
    product_limit: plan.product_limit,
    order_used: totalOrdersResult.count ?? 0,
    order_limit: plan.order_limit,
    storage_used_bytes: productImageBytes + storeAssetBytes,
    storage_limit_bytes: plan.storage_limit_bytes,
  };
}
