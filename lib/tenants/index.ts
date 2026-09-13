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

  // Start a transaction by creating the tenant and membership
  // Note: This is not a true transaction, but the RLS policies will enforce constraints

  // 1. Create the tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: tenantName,
      slug: tenantSlug,
      plan_id: planId,
      settings: {
        display_name: tenantName,
        description: '',
        contact_email: null,
        contact_phone: null,
        address: null,
        currency: 'USD',
        timezone: 'UTC',
        logo_url: null,
        favicon_url: null,
      },
    })
    .select()
    .single();

  if (tenantError || !tenant) {
    throw new Error(`Failed to create tenant: ${tenantError?.message}`);
  }

  // 2. Create the tenant membership
  const { error: memberError } = await supabase.from('tenant_members').insert({
    tenant_id: tenant.id,
    user_id: userId,
    role: 'tenant_admin',
  });

  if (memberError) {
    throw new Error(
      `Failed to create tenant membership: ${memberError.message}`
    );
  }

  // 3. Update the user's default_tenant_id
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ default_tenant_id: tenant.id })
    .eq('id', userId);

  if (profileError) {
    throw new Error(`Failed to set default tenant: ${profileError.message}`);
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

  const { data: tenant, error } = await supabase
    .from('tenants')
    .update({
      settings: updates,
      updated_at: new Date().toISOString(),
    })
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
