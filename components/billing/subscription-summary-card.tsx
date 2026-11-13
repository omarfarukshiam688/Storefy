'use client';

import * as React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { formatDateISO } from '@/lib/billing/format-currency';
import { deriveSubscriptionState } from '@/lib/billing/subscription-state';
import type { Subscription, Plan } from '@/types';

interface SubscriptionSummaryCardProps {
  subscription: Subscription;
  plan: Plan | null;
  isStaff: boolean;
  isSuspended: boolean;
}

function renderStatusInfo(
  state: ReturnType<typeof deriveSubscriptionState>,
  subscription: Subscription
): { label: string; description: string; icon: React.ReactNode; variant: string } {
  switch (state.kind) {
    case 'trial':
      return {
        label: 'Trial active',
        description: `Ends ${formatDateISO(state.trialEndDate)} (${state.trialDaysRemaining} days left)`,
        icon: <Clock className="h-4 w-4 text-sky-600" />,
        variant: 'info',
      };
    case 'active':
      return {
        label: 'Active',
        description: `Next billing ${formatDateISO(state.nextBillingDate)}`,
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
        variant: 'success',
      };
    case 'grace_period':
      return {
        label: 'Grace period',
        description: `Ends ${formatDateISO(subscription.grace_period_end)} (${state.graceDaysRemaining} days left)`,
        icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
        variant: 'warning',
      };
    case 'payment_failed':
      return {
        label: 'Payment failed',
        description: 'Your last payment could not be verified. Please renew to restore access.',
        icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
        variant: 'error',
      };
    case 'suspended':
      return {
        label: 'Suspended',
        description: 'Your subscription is suspended. Renew to reactivate your store.',
        icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
        variant: 'error',
      };
    case 'canceled':
      return {
        label: 'Cancellation scheduled',
        description: `Access until ${formatDateISO(state.nextBillingDate)}`,
        icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
        variant: 'warning',
      };
    case 'expired':
      return {
        label: 'Expired',
        description: 'Your subscription has expired. Choose a plan to reactivate.',
        icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
        variant: 'error',
      };
    default:
      return {
        label: 'No active subscription',
        description: 'Choose a plan to get started.',
        icon: <DollarSign className="h-4 w-4 text-slate-400" />,
        variant: 'neutral',
      };
  }
}

export function SubscriptionSummaryCard({ subscription, plan, isStaff, isSuspended }: SubscriptionSummaryCardProps) {
  const state = deriveSubscriptionState(subscription);
  const monthlyPrice = plan ? Number(plan.price_monthly) : 0;
  const planName = plan ? plan.name : 'Unknown plan';
  const statusInfo = renderStatusInfo(state, subscription);

  const canMutate = !isStaff && !isSuspended;

  return (
    <Card className="border-violet-200/60 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(255,255,255,0.55)_32%,_rgba(218,233,255,0.45)_70%,_rgba(224,215,255,0.35)_100%)] shadow-[0_20px_50px_-20px_rgba(79,70,229,0.25)]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-black tracking-tight">{planName}</CardTitle>
            <p className="text-sm text-slate-600">
              {monthlyPrice > 0 ? `৳${monthlyPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'Free'} / month
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-full border border-violet-200 bg-white/70 px-3 py-1">
          <span className={`flex h-2 w-2 rounded-full ${statusInfo.variant === 'success' ? 'bg-emerald-500' : statusInfo.variant === 'warning' ? 'bg-amber-500' : statusInfo.variant === 'error' ? 'bg-red-500' : 'bg-slate-500'}`} />
          <span className="text-xs font-semibold text-slate-700">{statusInfo.label}</span>
        </div>
        <p className="mt-2 text-sm text-slate-500">{statusInfo.description}</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Status
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">{state.label}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Billing period
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {formatDateISO(subscription.current_period_start)} —{' '}
              {formatDateISO(subscription.current_period_end)}
            </p>
          </div>
          {state.trialDaysRemaining !== null && (
            <div className="col-span-2 rounded-xl border border-border bg-muted p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Trial
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {state.trialDaysRemaining} day(s) remaining
              </p>
            </div>
          )}
          {state.graceDaysRemaining !== null && (
            <div className="col-span-2 rounded-xl border border-border bg-amber-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                Grace period
              </p>
              <p className="mt-1 text-sm font-medium text-amber-900">
                {state.graceDaysRemaining} day(s) remaining
              </p>
            </div>
          )}
          {state.hasScheduledChange && (
            <div className="col-span-2 rounded-xl border border-border bg-muted p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Scheduled change
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                Plan change scheduled for {formatDateISO(subscription.scheduled_plan_change_at)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        {canMutate && state.canUpgrade ? (
          <Button
            asChild
            className="w-full"
          >
            <a href="/dashboard/upgrade">Upgrade plan</a>
          </Button>
        ) : (
          <Button
            disabled
            className="w-full opacity-50 pointer-events-none"
            variant={canMutate ? 'default' : 'secondary'}
          >
            {isStaff ? 'View plans (read-only)' : isSuspended ? 'Upgrade suspended' : 'View plans'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
