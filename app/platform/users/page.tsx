import { requireSuperAdmin } from '@/lib/auth/tenant';
import { createClient } from '@/lib/supabase/server';
import { PlatformUsersClient } from './page-client';

export default async function PlatformUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  await requireSuperAdmin();

  const supabase = await createClient();
  const params = await searchParams;
  const search = params.search ?? '';

  let profilesQuery = supabase
    .from('profiles')
    .select('id, name, email, avatar_url')
    .order('created_at', { ascending: false });

  if (search) {
    profilesQuery = profilesQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: profiles, error: profilesError } = await profilesQuery;

  if (profilesError) {
    throw new Error(`Failed to fetch users: ${profilesError.message}`);
  }

  const profileRows = (profiles ?? []) as Array<{
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  }>;

  const userIds = profileRows.map((p) => p.id);

  const { data: memberships, error: membershipsError } = await supabase
    .from('tenant_members')
    .select('user_id, tenant_id, role, created_at')
    .in('user_id', userIds);

  if (membershipsError) {
    throw new Error(`Failed to fetch memberships: ${membershipsError.message}`);
  }

  const membershipRows = (memberships ?? []) as Array<{
    user_id: string;
    tenant_id: string;
    role: string;
    created_at: string;
  }>;

  const tenantIds = [...new Set(membershipRows.map((m) => m.tenant_id))];

  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, name, slug, is_active, created_at')
    .in('id', tenantIds);

  if (tenantsError) {
    throw new Error(`Failed to fetch tenants: ${tenantsError.message}`);
  }

  const tenantMap = new Map((tenants ?? []).map((t) => [t.id, t]));

  const membershipsByUserId = new Map<string, Array<{
    tenant_id: string;
    role: string;
    created_at: string;
  }>>();

  for (const m of membershipRows) {
    const existing = membershipsByUserId.get(m.user_id) ?? [];
    existing.push({
      tenant_id: m.tenant_id,
      role: m.role,
      created_at: m.created_at,
    });
    membershipsByUserId.set(m.user_id, existing);
  }

  const users = profileRows.map((profile) => {
    const userMemberships = membershipsByUserId.get(profile.id) ?? [];
    const tenantEntries = userMemberships
      .map((m) => tenantMap.get(m.tenant_id))
      .filter((tenant): tenant is NonNullable<typeof tenant> => tenant !== undefined);

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      tenants: tenantEntries.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        is_active: tenant.is_active,
        role: userMemberships.find((m) => m.tenant_id === tenant.id)!.role,
        created_at: tenant.created_at,
      })),
    };
  });

  return <PlatformUsersClient initialUsers={users} />;
}
