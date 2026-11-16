import { requireSuperAdmin } from '@/lib/auth/tenant';
import { InfrastructureUsageDashboard } from '@/components/platform/infrastructure/infrastructure-usage-dashboard';

export default async function InfrastructureUsagePage() {
  await requireSuperAdmin();
  return <InfrastructureUsageDashboard />;
}
