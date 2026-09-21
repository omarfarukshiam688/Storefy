import { requireSuperAdmin } from '@/lib/auth/tenant';
import { getPlatformTenantById, getTenantMembersPlatform } from '@/lib/platform';
import { TenantMembersClient } from './page-client';

export default async function TenantMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();

  const { id } = await params;
  const [tenant, members] = await Promise.all([
    getPlatformTenantById(id),
    getTenantMembersPlatform(id),
  ]);

  return (
    <TenantMembersClient
      tenantId={id}
      tenantName={tenant.name}
      initialMembers={members}
    />
  );
}
