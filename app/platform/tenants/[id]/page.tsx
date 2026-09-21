import { requireSuperAdmin } from '@/lib/auth/tenant';
import { getPlatformTenantById } from '@/lib/platform';
import { PlatformTenantDetailClient } from './page-client';

export default async function PlatformTenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();

  const { id } = await params;
  const tenant = await getPlatformTenantById(id);

  return <PlatformTenantDetailClient tenant={tenant} />;
}
