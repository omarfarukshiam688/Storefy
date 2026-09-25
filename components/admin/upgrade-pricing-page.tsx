'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Plan } from '@/types';

interface UpgradePricingPageProps {
  plans: Plan[];
  currentPlanId: string | null;
}

const PAID_PLAN_NAMES = new Set(['Starter', 'Growth', 'Scale']);

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
    features.push(`Up to ${productLimit.toLocaleString()} products`);
  }

  const orderLimit = plan.order_limit;
  if (orderLimit === -1) {
    features.push('Unlimited orders');
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

function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('en-US')}`;
}

export function UpgradePricingPage({ plans, currentPlanId }: UpgradePricingPageProps) {
  const [billingPeriod, setBillingPeriod] = React.useState<'monthly' | 'yearly'>('monthly');

  const paidPlans = plans
    .filter((plan) => plan.is_active && PAID_PLAN_NAMES.has(plan.name))
    .sort((a, b) => a.price_monthly - b.price_monthly);

  const currentPlan = plans.find((p) => p.id === currentPlanId) ?? null;

  const handlePlanClick = (plan: Plan) => {
    if (plan.id === currentPlanId) {
      toast.info('This is your current plan');
      return;
    }
    toast.info('Payment integration coming soon');
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
          Upgrade your plan
        </h1>
        <p className="mt-3 text-base text-slate-600">
          {currentPlan
            ? `You are currently on the ${currentPlan.name} plan. Choose a plan that fits your business.`
            : 'Choose the perfect plan for your business.'}
        </p>
      </div>

      <div className="flex items-center justify-center">
        <div
          className="inline-flex rounded-xl border border-violet-200 bg-violet-50/60 p-1"
          role="group"
          aria-label="Billing period"
        >
          <button
            type="button"
            onClick={() => setBillingPeriod('monthly')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold transition-all',
              billingPeriod === 'monthly'
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
            aria-pressed={billingPeriod === 'monthly'}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingPeriod('yearly')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold transition-all',
              billingPeriod === 'yearly'
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
            aria-pressed={billingPeriod === 'yearly'}
          >
            Yearly
            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              Save 10%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {paidPlans.map((plan) => {
          const state = getPlanState(plan);
          const isCurrent = state === 'current';
          const isMostPopular = plan.name === 'Growth';
          const monthlyPrice = plan.price_monthly;
          const yearlyPrice = Math.round(monthlyPrice * 12 * 0.9);
          const yearlySavings = Math.round(monthlyPrice * 12 * 0.1);
          const effectiveMonthly = Math.round((monthlyPrice * 12 * 0.9) / 12);
          const displayPrice = billingPeriod === 'monthly' ? monthlyPrice : yearlyPrice;
          const displayPeriod = billingPeriod === 'monthly' ? '/month' : '/year';
          const features = getPlanFeatures(plan);

          return (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col rounded-2xl bg-white/80 p-10 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] transition-all hover:shadow-[0_25px_60px_-35px_rgba(76,29,149,0.45)]',
                isMostPopular
                  ? 'border-2 border-violet-500 p-12 shadow-[0_20px_60px_-30px_rgba(76,29,149,0.45)]'
                  : 'border border-violet-100'
              )}
            >
              {(isCurrent || isMostPopular) && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {isCurrent && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      Current Plan
                    </span>
                  )}
                  {isMostPopular && !isCurrent && (
                    <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white">
                      Most Popular
                    </span>
                  )}
                </div>
              )}

              <div className="flex-1">
                <div className="text-center">
                  <h3 className="text-lg font-bold tracking-tight text-slate-900">{plan.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                </div>

                <div className="mt-10 text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black tracking-tight text-slate-900">
                      {formatBDT(displayPrice)}
                    </span>
                    <span className="text-sm text-slate-500">{displayPeriod}</span>
                  </div>
                  {billingPeriod === 'yearly' && monthlyPrice > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-semibold text-emerald-600">
                        Save {formatBDT(yearlySavings)}/year
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatBDT(effectiveMonthly)}/month equivalent
                      </p>
                    </div>
                  )}
                </div>

                <ul className="mt-10 space-y-4">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-12">
                {isCurrent ? (
                  <Button disabled className="w-full" variant="secondary">
                    Current Plan
                  </Button>
                ) : state === 'upgrade' ? (
                  <Button
                    onClick={() => handlePlanClick(plan)}
                    className={cn('w-full', isMostPopular ? 'bg-violet-700 text-white hover:bg-violet-800' : 'bg-violet-600 text-white hover:bg-violet-700')}
                  >
                    Choose {plan.name}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => handlePlanClick(plan)}
                    className="w-full"
                  >
                    Downgrade to {plan.name}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 text-center text-sm text-slate-600">
        Payment integration coming soon. You will not be charged during this preview.
      </div>
    </div>
  );
}
