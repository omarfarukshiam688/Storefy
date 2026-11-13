'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBDT } from '@/lib/billing/format-currency';
import type { Plan } from '@/types';

function getPlanFeatures(plan: Plan): string[] {
  const features: string[] = [];
  const f = plan.features;

  if (f.analytics) {
    features.push('Analytics dashboard');
  }

  if (f.custom_domain) {
    features.push('Custom domain');
  }

  const members = typeof f.team_members === 'number' ? f.team_members : 0;
  features.push(`Up to ${members} team members`);

  const productLimit = plan.product_limit;
  if (productLimit === -1) {
    features.push('Unlimited products');
  } else {
    features.push(`Up to ${productLimit.toLocaleString()} active products`);
    if (plan.archived_product_limit > 0) {
      features.push(`Up to ${plan.archived_product_limit.toLocaleString()} archived products`);
    }
  }

  const orderLimit = plan.order_limit;
  if (orderLimit === -1) {
    features.push('Unlimited orders/month');
  } else {
    features.push(`Up to ${orderLimit.toLocaleString()} orders/month`);
  }

  const storageGB = plan.storage_limit_bytes / (1024 * 1024 * 1024);
  if (plan.storage_limit_bytes === -1) {
    features.push('Unlimited storage');
  } else if (storageGB >= 1) {
    features.push(`${storageGB.toFixed(0)} GB storage`);
  } else {
    features.push(`${(storageGB * 1024).toFixed(0)} MB storage`);
  }

  return features;
}

interface UpgradePricingPageProps {
  plans: Plan[];
  currentPlanId: string | null;
}

export function UpgradePricingPage({ plans, currentPlanId }: UpgradePricingPageProps) {
  const activePaidPlans = plans
    .filter((plan) => plan.is_active && plan.price_monthly > 0)
    .sort((a, b) => a.price_monthly - b.price_monthly);

  const currentPlan = plans.find((p) => p.id === currentPlanId) ?? null;

  const [upgradeDialogOpen, setUpgradeDialogOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<Plan | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);

  const handleUpgradeClick = (plan: Plan) => {
    if (!currentPlan) return;
    if (plan.id === currentPlanId) {
      toast.info('This is your current plan');
      return;
    }
    if (plan.price_monthly <= currentPlan.price_monthly) {
      toast.info('Use the billing page to manage downgrades.');
      return;
    }

    setSelectedPlan(plan);
    setUpgradeDialogOpen(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) return;
    setIsCreating(true);

    try {
      const res = await fetch('/api/subscriptions/payments/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'upgrade',
          targetPlanId: selectedPlan.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to create upgrade payment');
        return;
      }

      setUpgradeDialogOpen(false);
      setSelectedPlan(null);
      toast.success(data.message || 'Upgrade payment created. Awaiting verification.');
    } catch {
      toast.error('Unexpected error creating upgrade payment');
    } finally {
      setIsCreating(false);
    }
  };

  const getPlanState = (plan: Plan): 'current' | 'upgrade' | 'downgrade' | 'available' => {
    if (plan.id === currentPlanId) return 'current';
    if (!currentPlan) return 'available';
    if (plan.price_monthly > currentPlan.price_monthly) return 'upgrade';
    if (plan.price_monthly < currentPlan.price_monthly) return 'downgrade';
    return 'available';
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-black tracking-[-0.07em] text-slate-900 sm:text-4xl">
          Choose your plan
        </h1>
        <p className="mt-3 text-base text-slate-600">
          {currentPlan
            ? `You are currently on the ${currentPlan.name} plan. Select a higher plan to upgrade.`
            : 'Select a plan to start your subscription.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {activePaidPlans.map((plan) => {
          const state = getPlanState(plan);
          const isCurrent = state === 'current';
          const isUpgrade = state === 'upgrade';
          const monthlyPrice = Number(plan.price_monthly);
          const features = getPlanFeatures(plan);

          return (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col rounded-2xl border p-8 transition-all hover:shadow-md',
                isCurrent ? 'border-violet-200/60 bg-violet-50/40' : 'border-border bg-white'
              )}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="flex-1">
                <div className="text-center">
                  <h3 className="text-lg font-bold tracking-tight text-slate-900">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                </div>

                <div className="mt-10 text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black tracking-tight text-slate-900">
                      {formatBDT(monthlyPrice)}
                    </span>
                    <span className="text-sm text-slate-500">/month</span>
                  </div>
                </div>

                <ul className="mt-8 space-y-3">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                {isCurrent ? (
                  <Button disabled className="w-full" variant="secondary">
                    Current Plan
                  </Button>
                ) : isUpgrade ? (
                  <Button
                    onClick={() => handleUpgradeClick(plan)}
                    disabled={isCreating}
                    className="w-full bg-violet-600 text-white hover:bg-violet-700"
                  >
                    {isCreating ? 'Creating payment…' : `Upgrade to ${plan.name}`}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => handleUpgradeClick(plan)}
                    disabled
                    className="w-full opacity-50 pointer-events-none"
                  >
                    Downgrade scheduled next cycle
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 text-center text-sm text-slate-600">
        All plans are billed monthly in BDT. Upgrades require payment verification before activation.
        Downgrades take effect on your next billing date.
      </div>

      {upgradeDialogOpen && selectedPlan && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            role="button"
            tabIndex={0}
            onClick={() => setUpgradeDialogOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setUpgradeDialogOpen(false);
            }}
          />
          <div className="relative w-full max-w-md p-4">
            <div className="bg-white rounded-2xl border border-violet-100 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 id="upgrade-dialog-title" className="text-lg font-bold text-slate-900">
                  Confirm Upgrade
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setUpgradeDialogOpen(false)}
                  aria-label="Close dialog"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Upgrade from <strong>{currentPlan?.name}</strong> to{' '}
                <strong>{selectedPlan.name}</strong>. The new plan activates after your payment is verified.
              </p>
              <div className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Prorated amount
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  Calculated server-side after confirmation
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setUpgradeDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmUpgrade}
                  disabled={isCreating}
                  className="flex-1 bg-violet-600 text-white hover:bg-violet-700"
                >
                  {isCreating ? 'Creating…' : 'Confirm Upgrade'}
                </Button>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Payment will be reviewed by Storefy. No automatic card charge.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
