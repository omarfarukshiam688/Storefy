import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';

export interface TenantResourceUsage {
  product_used: number;
  product_limit: number;
  archived_product_used: number;
  archived_product_limit: number;
  order_used: number;
  order_limit: number;
  storage_used_bytes: number;
  storage_limit_bytes: number;
}

type PlanLimits = {
  product_limit: number;
  archived_product_limit: number;
  order_limit: number;
  storage_limit_bytes: number;
};

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unavailable';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1
  );
  const value = bytes / Math.pow(k, i);
  return `${parseFloat(value.toFixed(2))} ${sizes[i]}`;
}

export interface StorageSizeMeasurement {
  status: 'ok' | 'error';
  bytes: number;
  failedPaths: string[];
  error?: string;
}

function asPlanLimits(value: unknown): PlanLimits | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || typeof candidate !== 'object') return null;
  const plan = candidate as Record<string, unknown>;
  const product_limit = Number(plan.product_limit);
  const archived_product_limit = Number(plan.archived_product_limit);
  const order_limit = Number(plan.order_limit);
  const storage_limit_bytes = Number(plan.storage_limit_bytes);
  if (
    !Number.isFinite(product_limit) ||
    !Number.isFinite(archived_product_limit) ||
    !Number.isFinite(order_limit) ||
    !Number.isFinite(storage_limit_bytes)
  ) {
    return null;
  }
  return { product_limit, archived_product_limit, order_limit, storage_limit_bytes };
}

/**
 * Measures total bytes for the given storage object paths.
 *
 * IMPORTANT: This never treats an unknown measurement as zero. If any object
 * size cannot be determined, status is "error" and callers must fail safely for
 * quota-sensitive decisions (do not allow potentially unlimited uploads).
 */
export async function getBytesFromStorage(
  bucket: string,
  paths: string[]
): Promise<StorageSizeMeasurement> {
  if (paths.length === 0) {
    return { status: 'ok', bytes: 0, failedPaths: [] };
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (e) {
    return {
      status: 'error',
      bytes: 0,
      failedPaths: paths,
      error: e instanceof Error ? e.message : 'Storage client unavailable',
    };
  }

  let total = 0;
  const failedPaths: string[] = [];
  let firstError: string | undefined;

  for (const path of paths) {
    try {
      const infoResult = await supabase.storage.from(bucket).info(path);
      const infoError = (infoResult as { error?: { message?: string } | null }).error;
      const info = (infoResult as { data?: unknown }).data;

      if (infoError || !info) {
        failedPaths.push(path);
        firstError =
          firstError ?? (infoError?.message ?? 'Storage object info unavailable');
        continue;
      }

      const size = (info as { size?: number }).size;
      if (typeof size === 'number' && Number.isFinite(size) && size >= 0) {
        total += size;
      } else {
        failedPaths.push(path);
        firstError = firstError ?? 'Storage object size missing';
      }
    } catch (e) {
      failedPaths.push(path);
      firstError =
        firstError ?? (e instanceof Error ? e.message : 'Storage info failed');
    }
  }

  if (failedPaths.length > 0) {
    return { status: 'error', bytes: total, failedPaths, error: firstError };
  }

  return { status: 'ok', bytes: total, failedPaths: [] };
}

export async function getTenantResourceUsage(
  tenantId: string
): Promise<TenantResourceUsage> {
  const supabase = await createClient();

  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select(
      'plan_id, plan:plans!plan_id(product_limit, archived_product_limit, order_limit, storage_limit_bytes)'
    )
    .eq('tenant_id', tenantId)
    .in('status', [
      'active',
      'trialing',
      'past_due',
      'suspended',
      'canceled',
      'expired',
    ])
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError) {
    throw new Error(subError.message ?? 'Failed to load subscription');
  }

  let plan = asPlanLimits(subscription?.plan);

  if (!subscription) {
    // Fallback to tenant plan_id for legacy/trial tenants without subscription
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select(
        'plan_id, plan:plans!plan_id(product_limit, archived_product_limit, order_limit, storage_limit_bytes)'
      )
      .eq('id', tenantId)
      .maybeSingle();

    if (tenantError) {
      throw new Error(tenantError.message ?? 'Failed to load tenant plan');
    }
    plan = asPlanLimits(tenant?.plan);
  }

  if (!plan) {
    throw new Error('Tenant plan not found');
  }

  const [
    activeProductsResult,
    archivedProductsResult,
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
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_archived', true),
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

  const queryErrors = [
    activeProductsResult.error,
    archivedProductsResult.error,
    totalOrdersResult.error,
    productImageRows.error,
    storeAssetRows.error,
  ].filter(Boolean);

  if (queryErrors.length > 0) {
    throw new Error(queryErrors[0]!.message ?? 'Failed to load tenant resource usage');
  }

  const productImagePaths = (productImageRows.data ?? [])
    .map((row) => (row as { storage_path?: unknown }).storage_path)
    .filter((path): path is string => typeof path === 'string' && path.length > 0);

  const storeAssetPaths = (storeAssetRows.data ?? [])
    .map((row) => (row as { storage_path?: unknown }).storage_path)
    .filter((path): path is string => typeof path === 'string' && path.length > 0);

  let storage_used_bytes: number;
  try {
    const [productImageStorage, storeAssetStorage] = await Promise.all([
      getBytesFromStorage('product-images', productImagePaths),
      getBytesFromStorage('store-assets', storeAssetPaths),
    ]);

    const storageMeasurementFailed =
      productImageStorage.status === 'error' ||
      storeAssetStorage.status === 'error';

    storage_used_bytes = storageMeasurementFailed
      ? -1
      : productImageStorage.bytes + storeAssetStorage.bytes;
  } catch {
    storage_used_bytes = -1;
  }

  return {
    product_used: activeProductsResult.count ?? 0,
    product_limit: plan.product_limit,
    archived_product_used: archivedProductsResult.count ?? 0,
    archived_product_limit: plan.archived_product_limit,
    order_used: totalOrdersResult.count ?? 0,
    order_limit: plan.order_limit,
    storage_used_bytes,
    storage_limit_bytes: plan.storage_limit_bytes,
  };
}
