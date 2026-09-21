import { requireSuperAdmin } from '@/lib/auth/tenant';
import { getPlatformTenants } from '@/lib/platform';
import { PlatformTenantsClient } from './page-client';

export default async function PlatformTenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  await requireSuperAdmin();

  const params = await searchParams;
  const { tenants, total } = await getPlatformTenants({
    search: params.search,
    status: params.status,
    page: 1,
    pageSize: 50,
  });

  return (
    <PlatformTenantsClient
      initialTenants={tenants}
      initialTotal={total}
      initialSearch={params.search}
      initialStatus={params.status}
    />
  );
}
