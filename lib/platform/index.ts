import { createClient } from '@/lib/supabase/server';
import { getBytesFromStorage } from '@/lib/plans/usage';
import type { Tenant, Plan } from '@/types';

export interface PlatformOverview {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
}

export interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  plan_id: string;
  settings: Record<string, unknown>;
  plan: {
    id: string;
    name: string;
    description: string | null;
    price_monthly: number;
    product_limit: number;
    order_limit: number;
    storage_limit_bytes: number;
    features: Record<string, unknown>;
    is_active: boolean;
  } | null;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  usage: {
    products: number;
    orders: number;
    members: number;
    storage_used_bytes: number;
  };
}

export interface PlatformUserTenants {
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  tenants: Array<{
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    role: string;
    created_at: string;
  }>;
}

async function getTenantResourceUsageFromClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<{ products: number; orders: number; members: number; storage_used_bytes: number }> {
  const [
    activeProductsResult,
    totalOrdersResult,
    membersResult,
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
      .from('tenant_members')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
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
    products: activeProductsResult.count ?? 0,
    orders: totalOrdersResult.count ?? 0,
    members: membersResult.count ?? 0,
    storage_used_bytes: productImageStorageBytes + storeAssetStorageBytes,
  };
}

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const supabase = await createClient();

  const [
    totalTenantsResult,
    activeTenantsResult,
    trialTenantsResult,
    suspendedTenantsResult,
    totalUsersResult,
    totalProductsResult,
    totalOrdersResult,
    totalRevenueResult,
  ] = await Promise.all([
    supabase.from('tenants').select('id', { count: 'exact', head: true }),
    supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('settings->>trial_status', 'trial').eq('is_active', true),
    supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('is_active', false),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_archived', false),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('subtotal').eq('payment_status', 'paid'),
  ]);

  const totalRevenue = (totalRevenueResult.data ?? []).reduce(
    (sum, order) => sum + Number(order.subtotal),
    0
  );

  return {
    totalTenants: totalTenantsResult.count ?? 0,
    activeTenants: activeTenantsResult.count ?? 0,
    trialTenants: trialTenantsResult.count ?? 0,
    suspendedTenants: suspendedTenantsResult.count ?? 0,
    totalUsers: totalUsersResult.count ?? 0,
    totalProducts: totalProductsResult.count ?? 0,
    totalOrders: totalOrdersResult.count ?? 0,
    totalRevenue,
  };
}

export async function getRecentTenants(limit = 5): Promise<Tenant[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, slug, is_active, created_at, updated_at, plan_id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch recent tenants: ${error.message}`);
  }

  return (data ?? []) as Tenant[];
}

export async function getPlatformTenants(filters?: {
  search?: string;
  status?: string;
  planId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ tenants: PlatformTenant[]; total: number }> {
  const supabase = await createClient();
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('tenants')
    .select(
      'id, name, slug, is_active, created_at, updated_at, plan_id, settings',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`);
  }

  if (filters?.status === 'active') {
    query = query.eq('is_active', true);
  } else if (filters?.status === 'suspended') {
    query = query.eq('is_active', false);
  } else if (filters?.status === 'trial') {
    query = query.eq('settings->>trial_status', 'trial').eq('is_active', true);
  }

  if (filters?.planId) {
    query = query.eq('plan_id', filters.planId);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch tenants: ${error.message}`);
  }

  const tenantRows = (data ?? []) as Array<{
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    plan_id: string;
    settings: Record<string, unknown>;
  }>;

  const tenantIds = tenantRows.map((t) => t.id);
  const planIds = [...new Set(tenantRows.map((t) => t.plan_id).filter((id): id is string => Boolean(id)))];

  const [{ data: plans }, { data: adminMembers }, { data: profiles }, productsResult, ordersResult, membersResult, productImagesResult, storeAssetsResult] =
    await Promise.all([
      supabase.from('plans').select('*').in('id', planIds),
      supabase
        .from('tenant_members')
        .select('tenant_id, user_id')
        .in('tenant_id', tenantIds)
        .eq('role', 'tenant_admin')
        .eq('is_active', true),
      supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .in('id', [...new Set(tenantIds)]),
      supabase
        .from('products')
        .select('tenant_id, id', { count: 'exact', head: true })
        .in('tenant_id', tenantIds)
        .eq('is_active', true)
        .eq('is_archived', false),
      supabase
        .from('orders')
        .select('tenant_id', { count: 'exact', head: true })
        .in('tenant_id', tenantIds),
      supabase
        .from('tenant_members')
        .select('tenant_id, id', { count: 'exact', head: true })
        .in('tenant_id', tenantIds)
        .eq('is_active', true),
      supabase
        .from('product_images')
        .select('tenant_id, file_size')
        .in('tenant_id', tenantIds),
      supabase
        .from('store_assets')
        .select('tenant_id, file_size')
        .in('tenant_id', tenantIds),
    ]);

  const planMap = new Map((plans ?? []).map((p) => [p.id, p]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const ownerMap = new Map<string, { id: string; name: string | null; email: string | null } | null>();

  for (const m of adminMembers ?? []) {
    if (!ownerMap.has(m.tenant_id)) {
      const profile = profileMap.get(m.user_id) ?? null;
      if (profile) {
        ownerMap.set(m.tenant_id, {
          id: profile.id,
          name: profile.name,
          email: profile.email,
        });
      }
    }
  }

  const productCounts: Record<string, number> = {};
  const orderCounts: Record<string, number> = {};
  const memberCounts: Record<string, number> = {};
  const storageBytes: Record<string, number> = {};

  for (const t of tenantRows) {
    productCounts[t.id] = 0;
    orderCounts[t.id] = 0;
    memberCounts[t.id] = 0;
    storageBytes[t.id] = 0;
  }

  if (productsResult.error === null && productsResult.data) {
    for (const p of productsResult.data) {
      productCounts[p.tenant_id] = (productCounts[p.tenant_id] || 0) + 1;
    }
  }

  if (ordersResult.error === null && ordersResult.data) {
    for (const o of ordersResult.data) {
      orderCounts[o.tenant_id] = (orderCounts[o.tenant_id] || 0) + 1;
    }
  }

  if (membersResult.error === null && membersResult.data) {
    for (const m of membersResult.data) {
      memberCounts[m.tenant_id] = (memberCounts[m.tenant_id] || 0) + 1;
    }
  }

  if (productImagesResult.error === null && productImagesResult.data) {
    for (const row of productImagesResult.data) {
      storageBytes[row.tenant_id] = (storageBytes[row.tenant_id] || 0) + (row.file_size ?? 0);
    }
  }

  if (storeAssetsResult.error === null && storeAssetsResult.data) {
    for (const row of storeAssetsResult.data) {
      storageBytes[row.tenant_id] = (storageBytes[row.tenant_id] || 0) + (row.file_size ?? 0);
    }
  }

  const tenants: PlatformTenant[] = tenantRows.map((t) => {
    const plan = planMap.get(t.plan_id) ?? null;

    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      is_active: t.is_active,
      created_at: t.created_at,
      updated_at: t.updated_at,
      plan_id: t.plan_id,
      settings: t.settings,
      plan: plan
        ? {
            id: plan.id,
            name: plan.name,
            description: plan.description,
            price_monthly: plan.price_monthly,
            product_limit: plan.product_limit,
            order_limit: plan.order_limit,
            storage_limit_bytes: plan.storage_limit_bytes,
            features: plan.features,
            is_active: plan.is_active,
          }
        : null,
      owner: ownerMap.get(t.id) ?? null,
      usage: {
        products: productCounts[t.id] ?? 0,
        orders: orderCounts[t.id] ?? 0,
        members: memberCounts[t.id] ?? 0,
        storage_used_bytes: storageBytes[t.id] ?? 0,
      },
    };
  });

  return {
    tenants,
    total: count ?? tenants.length,
  };
}

export async function getPlatformTenantById(tenantId: string): Promise<PlatformTenant> {
  const supabase = await createClient();

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, slug, is_active, created_at, updated_at, plan_id, settings')
    .eq('id', tenantId)
    .maybeSingle();

  if (tenantError || !tenant) {
    throw new Error(`Failed to fetch tenant: ${tenantError?.message ?? 'Not found'}`);
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from('tenant_members')
    .select('user_id, role, is_active, last_login_at, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (membershipsError) {
    throw new Error(`Failed to fetch tenant members: ${membershipsError.message}`);
  }

  const membershipRows = (memberships ?? []) as Array<{
    user_id: string;
    role: string;
    is_active: boolean;
    last_login_at: string | null;
    created_at: string;
  }>;

  const userIds = [...new Set(membershipRows.map((m) => m.user_id))];
  let profileMap = new Map<string, {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  }>();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url')
      .in('id', userIds);

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  }

  const owner = membershipRows
    .filter((m) => m.role === 'tenant_admin')
    .map((m) => profileMap.get(m.user_id))
    .find((p) => p !== null) ?? null;

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, name, description, price_monthly, product_limit, order_limit, storage_limit_bytes, features, is_active')
    .eq('id', tenant.plan_id)
    .maybeSingle();

  if (planError) {
    throw new Error(`Failed to fetch plan: ${planError.message}`);
  }

  const usage = await getTenantResourceUsageFromClient(supabase, tenantId);

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    is_active: tenant.is_active,
    created_at: tenant.created_at,
    updated_at: tenant.updated_at,
    plan_id: tenant.plan_id,
    settings: tenant.settings,
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          price_monthly: plan.price_monthly,
          product_limit: plan.product_limit,
          order_limit: plan.order_limit,
          storage_limit_bytes: plan.storage_limit_bytes,
          features: plan.features,
          is_active: plan.is_active,
        }
      : null,
    owner: owner
      ? {
          id: owner.id,
          name: owner.name,
          email: owner.email,
        }
      : null,
    usage: {
      products: usage.products,
      orders: usage.orders,
      members: usage.members,
      storage_used_bytes: usage.storage_used_bytes,
    },
  };
}

export async function getPlatformPlans(): Promise<Plan[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('price_monthly', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch plans: ${error.message}`);
  }

  return (data ?? []) as Plan[];
}

export async function suspendTenant(tenantId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('tenants')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', tenantId);

  if (error) {
    throw new Error(`Failed to suspend tenant: ${error.message}`);
  }
}

export async function reactivateTenant(tenantId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('tenants')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', tenantId);

  if (error) {
    throw new Error(`Failed to reactivate tenant: ${error.message}`);
  }
}

export async function assignPlanToTenant(tenantId: string, planId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('tenants')
    .update({ plan_id: planId, updated_at: new Date().toISOString() })
    .eq('id', tenantId);

  if (error) {
    throw new Error(`Failed to assign plan: ${error.message}`);
  }
}

export async function getUserTenantsPlatform(userId: string): Promise<PlatformUserTenants> {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error(`Failed to fetch user: ${profileError?.message ?? 'Not found'}`);
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('tenant_members')
    .select('tenant_id, role, created_at')
    .eq('user_id', userId);

  if (membershipError) {
    throw new Error(`Failed to fetch memberships: ${membershipError.message}`);
  }

  const membershipRows = (memberships ?? []) as Array<{
    tenant_id: string;
    role: string;
    created_at: string;
  }>;

  const tenantIds = membershipRows.map((m) => m.tenant_id);
  let tenantMap = new Map<string, {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    created_at: string;
  }>();

  if (tenantIds.length > 0) {
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, slug, is_active, created_at')
      .in('id', tenantIds);

    if (tenantsError) {
      throw new Error(`Failed to fetch tenants: ${tenantsError.message}`);
    }

    tenantMap = new Map((tenants ?? []).map((t) => [t.id, t]));
  }

  const tenants = membershipRows
    .filter((m) => tenantMap.has(m.tenant_id))
    .map((m) => {
      const tenant = tenantMap.get(m.tenant_id)!;
      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        is_active: tenant.is_active,
        role: m.role,
        created_at: m.created_at,
      };
    });

  return {
    user: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
    },
    tenants,
  };
}

export async function getTenantMembersPlatform(tenantId: string): Promise<Array<{
  id: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}>> {
  const supabase = await createClient();

  const { data: memberships, error: membershipsError } = await supabase
    .from('tenant_members')
    .select('id, role, is_active, last_login_at, created_at, user_id')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (membershipsError) {
    throw new Error(`Failed to fetch members: ${membershipsError.message}`);
  }

  const membershipRows = (memberships ?? []) as Array<{
    id: string;
    role: string;
    is_active: boolean;
    last_login_at: string | null;
    created_at: string;
    user_id: string;
  }>;

  const userIds = [...new Set(membershipRows.map((m) => m.user_id))];
  let profileMap = new Map<string, {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  }>();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url')
      .in('id', userIds);

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  }

  return membershipRows.map((m) => ({
    id: m.id,
    role: m.role,
    is_active: m.is_active,
    last_login_at: m.last_login_at,
    created_at: m.created_at,
    user: profileMap.get(m.user_id) ?? null,
  }));
}
