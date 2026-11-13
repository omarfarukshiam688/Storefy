'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UpgradeDialog } from './upgrade-dialog';
import { DowngradeDialog } from './downgrade-dialog';
import type { Plan, Subscription } from '@/types';

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

interface PlanComparisonProps {
  currentPlan: Plan | null;
  plans: Plan[];
  subscription: Subscription | null;
  isStaff: boolean;
  isSuspended: boolean;
}

export function PlanComparison({
  currentPlan,
  plans,
  subscription,
  isStaff,
  isSuspended,
}: PlanComparisonProps) {
  const paidPlans = plans
    .filter((plan) => plan.is_active && plan.price_monthly > 0)
    .sort((a, b) => a.price_monthly - b.price_monthly);

  const [upgradeDialogOpen, setUpgradeDialogOpen] = React.useState(false);
  const [downgradeDialogOpen, setDowngradeDialogOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<Plan | null>(null);

  const canMutate = !isStaff && !isSuspended;
  const hasScheduledChange = Boolean(subscription?.scheduled_plan_id);
  const scheduledTargetPlan = plans.find((p) => p.id === subscription?.scheduled_plan_id);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Choose your plan</CardTitle>
          <p className="text-sm text-slate-600">
            Select the plan that fits your business. Upgrades take effect after payment verification.
            Downgrades take effect on your next billing date.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 p-0">
          {paidPlans.map((plan) => {
            const isCurrent = currentPlan?.id === plan.id;
            const isUpgrade =
              currentPlan && plan.price_monthly > currentPlan.price_monthly;
            const isDowngrade =
              currentPlan && plan.price_monthly < currentPlan.price_monthly;
            const features = getPlanFeatures(plan);
            const monthlyPrice = Number(plan.price_monthly);

            return (
              <Card
                key={plan.id}
                className={cn(
                  'relative flex flex-col rounded-2xl border p-6 transition-all hover:shadow-md',
                  isCurrent ? 'border-violet-200/60 bg-violet-50/40' : 'border-border bg-white'
                )}
              >
                {(isCurrent || plan.name === 'GROWTH') && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    {isCurrent && (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        Current plan
                      </span>
                    )}
                    {plan.name === 'GROWTH' && !isCurrent && (
                      <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white">
                        Most popular
                      </span>
                    )}
                  </div>
                )}
                {hasScheduledChange && plan.id === subscription?.scheduled_plan_id && (
                  <div className="absolute -top-3 right-1/2 translate-x-1/2">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                      Scheduled downgrade
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

                  <div className="mt-8 text-center">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-black tracking-tight text-slate-900">
                        {monthlyPrice > 0 ? `৳${monthlyPrice.toLocaleString()}` : 'Free'}
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
                      Current plan
                    </Button>
                  ) : isUpgrade ? (
                    canMutate && !hasScheduledChange ? (
                      <Button
                        onClick={() => {
                          setSelectedPlan(plan);
                          setUpgradeDialogOpen(true);
                        }}
                        className="w-full bg-violet-600 text-white hover:bg-violet-700"
                      >
                        Upgrade to {plan.name}
                      </Button>
                    ) : (
                      <Button
                        disabled
                        className="w-full opacity-50 pointer-events-none"
                      >
                        {isStaff ? 'Upgrade (admin only)' : 'Upgrade suspended or scheduled'}
                      </Button>
                    )
                  ) : isDowngrade ? (
                    canMutate && !hasScheduledChange ? (
                      <Button
                        onClick={() => {
                          setSelectedPlan(plan);
                          setDowngradeDialogOpen(true);
                        }}
                        className="w-full bg-violet-600 text-white hover:bg-violet-700"
                      >
                        Downgrade to {plan.name}
                      </Button>
                    ) : (
                      <Button
                        disabled
                        className="w-full opacity-50 pointer-events-none"
                      >
                        {hasScheduledChange ? 'Downgrade already scheduled' : isStaff ? 'Downgrade (admin only)' : 'Downgrade suspended'}
                      </Button>
                    )
                  ) : (
                    <Button
                      disabled
                      className="w-full opacity-50 pointer-events-none"
                    >
                      Downgrade to {plan.name}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {canMutate && !hasScheduledChange && (
        <>
          {upgradeDialogOpen && selectedPlan && (
            <UpgradeDialog
              open={upgradeDialogOpen}
              onOpenChange={setUpgradeDialogOpen}
              currentPlan={currentPlan}
              targetPlan={selectedPlan}
            />
          )}
          {downgradeDialogOpen && selectedPlan && (
            <DowngradeDialog
              open={downgradeDialogOpen}
              onOpenChange={setDowngradeDialogOpen}
              currentPlan={currentPlan}
              targetPlan={selectedPlan}
              subscription={subscription}
            />
          )}
        </>
      )}

      {hasScheduledChange && scheduledTargetPlan && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 h-4 w-4 text-amber-600 shrink-0">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Downgrade scheduled
              </p>
              <p className="mt-1 text-sm text-amber-800">
                Your plan will change to{' '}
                <strong>{scheduledTargetPlan.name}</strong> on{' '}
                {new Date(subscription?.scheduled_plan_change_at ?? '').toLocaleDateString('en-BD', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}. Your current plan remains active until then.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
