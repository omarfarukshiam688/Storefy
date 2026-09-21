import { requireSuperAdmin } from '@/lib/auth/tenant';
import { getPlatformPlans } from '@/lib/platform';
import { PlatformPlansClient } from './page-client';

export default async function PlatformPlansPage() {
  await requireSuperAdmin();

  const plans = await getPlatformPlans();

  return <PlatformPlansClient initialPlans={plans} />;
}
