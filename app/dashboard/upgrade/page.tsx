import { getTenantContext } from '@/lib/auth/tenant';
import { getPlatformPlans } from '@/lib/platform';
import { UpgradePricingPage } from '@/components/admin/upgrade-pricing-page';

export default async function UpgradePage() {
  const context = await getTenantContext();
  const plans = await getPlatformPlans();

  const currentPlanId = context.activeTenant?.plan_id ?? null;

  if (!context.activeTenant) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 text-center">
        <h1 className="text-3xl font-black tracking-[-0.07em] text-slate-900">
          Upgrade your plan
        </h1>
        <p className="text-base text-slate-600">
          Please select or create a store to view available plans.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <UpgradePricingPage plans={plans} currentPlanId={currentPlanId} />
    </div>
  );
}
