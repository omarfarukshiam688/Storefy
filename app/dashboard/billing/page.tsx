import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/auth/session';
import { getBillingTenantContext, isSubscriptionSuspended } from '@/lib/auth/tenant';
import { getTenantPlan } from '@/lib/plans';
import { getPlatformPlans } from '@/lib/platform';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { SubscriptionSummaryCard } from '@/components/billing/subscription-summary-card';
import { TrialExperience } from '@/components/billing/trial-experience';
import { PlanComparison } from '@/components/billing/plan-comparison';
import { PaymentHistory } from '@/components/billing/payment-history';
import { BillingPolicy } from '@/components/billing/billing-policy';
import type { Subscription, Plan } from '@/types';

export default async function BillingPage() {
  let user;
  try {
    user = await requireAuthUser();
  } catch {
    redirect('/login');
  }

  if (!user.email_confirmed_at) {
    redirect('/verify-email');
  }

  const context = await getBillingTenantContext();

  if (!context || !context.activeTenant) {
    redirect('/dashboard/onboarding');
  }

  const { activeTenant, role } = context;
  const tenantId = activeTenant.id;
  const isStaff = role === 'tenant_staff';

  const [subscription, plan, plans] = await Promise.all([
    (async () => {
      const supabase = await (await import('@/lib/supabase/server')).createClient();
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, plan:plans(*)')
        .eq('tenant_id', tenantId)
        .order('current_period_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return data as Subscription & { plan: Plan | null };
    })(),
    getTenantPlan(tenantId).catch(() => null),
    getPlatformPlans().catch(() => [] as Plan[]),
  ]);

  // Determine if this is a subscription-suspended tenant (not administrative deactivation).
  // Uses explicit suspension_reason field — fail closed for ambiguous records.
  const isSubSuspended = isSubscriptionSuspended(activeTenant);

  // Administrative deactivation: tenant inactive but NOT subscription-suspended.
  // Deny billing access — this tenant was manually disabled or banned.
  if (activeTenant.is_active === false && !isSubSuspended) {
    redirect('/dashboard');
  }

  return (
    <DashboardShell
      profileName={context.profile.name}
      storeName={context.activeTenant.name}
      role={role}
      showUpgradeCta={false}
    >
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-[-0.07em] text-slate-900 sm:text-4xl">
              Billing
            </h1>
            <p className="mt-2 text-base text-slate-600">
              Manage your subscription, payments, and billing details.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-xs font-medium text-violet-700 hover:text-violet-900 underline-offset-4 hover:underline">
              Back to dashboard
            </a>
          </div>
        </div>

        {subscription ? (
          <>
            <SubscriptionSummaryCard
              subscription={subscription}
              plan={subscription.plan ?? plan ?? null}
              isStaff={isStaff}
              isSuspended={isSubSuspended}
            />

            <TrialExperience subscription={subscription} isStaff={isStaff} />

            <PlanComparison
              currentPlan={subscription.plan ?? plan ?? null}
              plans={plans}
              subscription={subscription}
              isStaff={isStaff}
              isSuspended={isSubSuspended}
            />

            <PaymentHistory />

            <BillingPolicy />
          </>
        ) : (
          <div className="rounded-2xl border border-violet-100 bg-white/80 p-12 text-center">
            <h2 className="text-xl font-semibold text-slate-900">
              No subscription found
            </h2>
            <p className="mt-2 text-slate-600">
              Your store does not have an active subscription.
              {isSubSuspended
                ? 'Your subscription has lapsed. Choose a plan to renew.'
                : 'Choose a plan to get started.'}
            </p>
            <div className="mt-6 flex justify-center">
              <a href="/dashboard/upgrade">
                <Button size="lg">Choose a plan</Button>
              </a>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
