import { createClient } from '@/lib/supabase/server';
import type { Tenant } from '@/types';

/**
 * Get all tenants a user belongs to
 */
export async function getUserTenants(userId: string): Promise<Tenant[]> {
  const supabase = await createClient();

  const { data: tenants, error } = await supabase
    .from('tenant_members')
    .select('tenants(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .returns<Array<{ tenants: Tenant }>>();

  if (error) {
    throw new Error(`Failed to get user tenants: ${error.message}`);
  }

  return tenants.map((tm) => tm.tenants).filter((t): t is Tenant => !!t);
}

/**
 * Check if a user has any tenant
 */
export async function userHasTenant(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('tenant_members')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to check user tenants: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

/**
 * Create a new tenant for a user
 * The user is automatically made a tenant_admin
 * The user's default_tenant_id is set to this new tenant
 */
export async function createTenantForUser(
  userId: string,
  tenantName: string,
  tenantSlug: string,
  planId: string
): Promise<Tenant> {
  const supabase = await createClient();

  // Use SECURITY DEFINER RPC for atomic tenant creation.
  // The function derives the user ID from auth.uid() internally,
  // but we pass it for API consistency and logging purposes.
  const { data: tenantId, error: rpcError } = await supabase.rpc(
    'create_tenant_for_user',
    {
      p_name: tenantName,
      p_slug: tenantSlug,
      p_plan_id: planId,
    }
  );

  if (rpcError || !tenantId) {
    throw new Error(
      `Failed to create tenant: ${rpcError?.message ?? 'Unknown error'}`
    );
  }

  // Fetch the created tenant to return the full record
  const { data: tenant, error: fetchError } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  if (fetchError || !tenant) {
    throw new Error(
      `Failed to fetch created tenant: ${fetchError?.message ?? 'Unknown error'}`
    );
  }

  return tenant;
}

/**
 * Check if slug is available (unique)
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug);

  if (error) {
    throw new Error(`Failed to check slug availability: ${error.message}`);
  }

  return (count ?? 0) === 0;
}

/**
 * Get default plan ID (cheapest/free plan)
 */
export async function getDefaultPlanId(): Promise<string> {
  const supabase = await createClient();

  const { data: plan, error } = await supabase
    .from('plans')
    .select('id')
    .eq('is_active', true)
    .order('price_monthly', { ascending: true })
    .limit(1)
    .single();

  if (error || !plan) {
    throw new Error('No active plan found');
  }

  return plan.id;
}

/**
 * Update tenant settings (for admins only)
 */
export async function updateTenantSettings(
  tenantId: string,
  updates: Record<string, unknown>
): Promise<Tenant> {
  const supabase = await createClient();

  const { name, ...settingsUpdates } = updates as { name?: string } & Record<string, unknown>;

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (name !== undefined) {
    updatePayload.name = name;
  }

  if (Object.keys(settingsUpdates).length > 0) {
    updatePayload.settings = settingsUpdates;
  }

  const { data: tenant, error } = await supabase
    .from('tenants')
    .update(updatePayload)
    .eq('id', tenantId)
    .select()
    .single();

  if (error || !tenant) {
    throw new Error(`Failed to update tenant settings: ${error?.message}`);
  }

  return tenant;
}

/**
 * Update tenant name and slug
 */
export async function updateTenantIdentity(
  tenantId: string,
  name?: string,
  slug?: string
): Promise<Tenant> {
  const supabase = await createClient();

  const updates: Record<string, string> = {};
  if (name) updates.name = name;
  if (slug) updates.slug = slug;

  const { data: tenant, error } = await supabase
    .from('tenants')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenantId)
    .select()
    .single();

  if (error || !tenant) {
    throw new Error(`Failed to update tenant: ${error?.message}`);
  }

  return tenant;
}
