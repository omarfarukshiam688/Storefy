import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/auth/session';
import { getTenantContext } from '@/lib/auth/tenant';
import { getTenantPlan } from '@/lib/plans';
import { getPlatformPlans } from '@/lib/platform';
import { ForbiddenError } from '@/lib/auth/errors';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user;
  try {
    user = await requireAuthUser();
  } catch {
    redirect('/login');
  }

  if (!user.email_confirmed_at) {
    redirect('/verify-email');
  }

  let context;
  try {
    context = await getTenantContext();
  } catch (error) {
    if (error instanceof ForbiddenError) {
      redirect('/login');
    }
    throw error;
  }

  const [tenantPlan, plans] = await Promise.all([
    context.activeTenant ? getTenantPlan(context.activeTenant.id) : Promise.resolve(null),
    getPlatformPlans(),
  ]);

  const paidPlans = plans
    .filter((plan) => plan.is_active && plan.price_monthly > 0)
    .sort((a, b) => a.price_monthly - b.price_monthly);

  const highestPaidPlanId = paidPlans.length > 0 ? paidPlans[paidPlans.length - 1].id : null;

  const showUpgradeCta =
    !!context.activeTenant &&
    !!tenantPlan &&
    (tenantPlan.price_monthly === 0 || tenantPlan.id !== highestPaidPlanId);

  return (
    <DashboardShell
      profileName={context.profile.name}
      storeName={context.activeTenant?.name ?? null}
      role={context.role}
      showUpgradeCta={showUpgradeCta}
    >
      {children}
    </DashboardShell>
  );
}
