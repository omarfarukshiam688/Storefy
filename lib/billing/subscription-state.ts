import type { Subscription } from '@/types';
import { formatDateISO } from './format-currency';

export type SubscriptionKind =
  | 'trial'
  | 'active'
  | 'payment_pending'
  | 'verification_required'
  | 'payment_failed'
  | 'grace_period'
  | 'suspended'
  | 'canceled'
  | 'expired'
  | 'no_subscription';

export interface DerivedSubscriptionState {
  kind: SubscriptionKind;
  label: string;
  description: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'brand' | 'neutral';
  canUpgrade: boolean;
  canRenew: boolean;
  canCancel: boolean;
  trialDaysRemaining: number | null;
  graceDaysRemaining: number | null;
  nextBillingDate: string | null;
  trialEndDate: string | null;
  hasScheduledChange: boolean;
  scheduledChangeTargetPlanId: string | null;
}

function toMs(value: string | null): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function deriveSubscriptionState(
  subscription: Subscription | null,
  now: Date = new Date()
): DerivedSubscriptionState {
  const defaultState: DerivedSubscriptionState = {
    kind: 'no_subscription',
    label: 'No active subscription',
    description: 'Choose a plan to start selling online.',
    variant: 'neutral',
    canUpgrade: false,
    canRenew: false,
    canCancel: false,
    trialDaysRemaining: null,
    graceDaysRemaining: null,
    nextBillingDate: null,
    trialEndDate: null,
    hasScheduledChange: false,
    scheduledChangeTargetPlanId: null,
  };

  if (!subscription) return defaultState;

const trialEndMs = toMs(subscription.trial_end);
const graceEndMs = toMs(subscription.grace_period_end);
const periodEndMs = toMs(subscription.current_period_end);

  const trialDaysRemaining =
    trialEndMs !== null
      ? Math.max(0, Math.ceil((trialEndMs - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

  const graceDaysRemaining =
    graceEndMs !== null
      ? Math.max(0, Math.ceil((graceEndMs - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

  const hasScheduledChange =
    Boolean(subscription.scheduled_plan_id) &&
    Boolean(subscription.scheduled_plan_change_at);

  const trialEndDate = subscription.trial_end ?? null;
  const nextBillingDate = subscription.current_period_end ?? null;

  // Trial active
  if (
    subscription.status === 'trialing' &&
    trialEndMs !== null &&
    trialEndMs > now.getTime()
  ) {
    return {
      kind: 'trial',
      label: 'Trial active',
      description: `Free trial ends ${formatDateISO(subscription.trial_end)}.`,
      variant: 'info',
      canUpgrade: true,
      canRenew: false,
      canCancel: false,
      trialDaysRemaining,
      graceDaysRemaining: null,
      nextBillingDate,
      trialEndDate,
      hasScheduledChange,
      scheduledChangeTargetPlanId: subscription.scheduled_plan_id ?? null,
    };
  }

  // Trial has ended but backend status may not yet be 'expired'.
  // Derive grace/expired from dates when status is stale.
  if (
    trialEndMs !== null &&
    trialEndMs <= now.getTime() &&
    (subscription.status === 'trialing' || subscription.status === 'active')
  ) {
    if (graceEndMs !== null && graceEndMs > now.getTime()) {
      return {
        kind: 'grace_period',
        label: 'Grace period',
        description: `Trial ended. Renew by ${formatDateISO(
          subscription.grace_period_end
        )} to avoid suspension.`,
        variant: 'warning',
        canUpgrade: true,
        canRenew: true,
        canCancel: false,
        trialDaysRemaining: null,
        graceDaysRemaining,
        nextBillingDate,
        trialEndDate,
        hasScheduledChange,
        scheduledChangeTargetPlanId: subscription.scheduled_plan_id ?? null,
      };
    }
    return {
      kind: 'expired',
      label: 'Expired',
      description: 'Your trial has expired. Choose a plan to reactivate.',
      variant: 'error',
      canUpgrade: true,
      canRenew: true,
      canCancel: false,
      trialDaysRemaining: null,
      graceDaysRemaining: null,
      nextBillingDate,
      trialEndDate,
      hasScheduledChange,
      scheduledChangeTargetPlanId: subscription.scheduled_plan_id ?? null,
    };
  }

  // Trial expired but within grace
  if (
    subscription.status === 'expired' &&
    graceEndMs !== null &&
    graceEndMs > now.getTime()
  ) {
    return {
      kind: 'grace_period',
      label: 'Grace period',
      description: `Paid period expired. Renew by ${formatDateISO(
        subscription.grace_period_end
      )} to avoid suspension.`,
      variant: 'warning',
      canUpgrade: true,
      canRenew: true,
      canCancel: false,
      trialDaysRemaining: null,
      graceDaysRemaining,
      nextBillingDate,
      trialEndDate,
      hasScheduledChange,
      scheduledChangeTargetPlanId: subscription.scheduled_plan_id ?? null,
    };
  }

  // Active paid
  if (subscription.status === 'active') {
    const description =
      trialEndMs !== null && trialEndMs <= now.getTime()
        ? `Billing period ends ${formatDateISO(subscription.current_period_end)}.`
        : `Active plan. Billing cycle ends ${formatDateISO(subscription.current_period_end)}.`;

    return {
      kind: 'active',
      label: 'Active',
      description,
      variant: 'success',
      canUpgrade: true,
      canRenew: periodEndMs !== null && periodEndMs <= now.getTime(),
      canCancel: true,
      trialDaysRemaining: null,
      graceDaysRemaining: null,
      nextBillingDate,
      trialEndDate,
      hasScheduledChange,
      scheduledChangeTargetPlanId: subscription.scheduled_plan_id ?? null,
    };
  }

  // Past due / payment failed
  if (subscription.status === 'past_due') {
    return {
      kind: 'payment_failed',
      label: 'Payment failed',
      description: 'Your last payment could not be verified. Please renew to restore access.',
      variant: 'error',
      canUpgrade: true,
      canRenew: true,
      canCancel: false,
      trialDaysRemaining: null,
      graceDaysRemaining: null,
      nextBillingDate,
      trialEndDate,
      hasScheduledChange,
      scheduledChangeTargetPlanId: subscription.scheduled_plan_id ?? null,
    };
  }

  // Suspended
  if (subscription.status === 'suspended') {
    return {
      kind: 'suspended',
      label: 'Suspended',
      description: 'Your subscription is suspended. Renew to reactivate your store.',
      variant: 'error',
      canUpgrade: true,
      canRenew: true,
      canCancel: false,
      trialDaysRemaining: null,
      graceDaysRemaining: null,
      nextBillingDate,
      trialEndDate,
      hasScheduledChange,
      scheduledChangeTargetPlanId: subscription.scheduled_plan_id ?? null,
    };
  }

  // Canceled (access continues until period end)
  if (subscription.status === 'canceled') {
    return {
      kind: 'canceled',
      label: 'Cancellation scheduled',
      description: `Access continues until ${formatDateISO(
        subscription.current_period_end
      )}.`,
      variant: 'warning',
      canUpgrade: true,
      canRenew: false,
      canCancel: false,
      trialDaysRemaining: null,
      graceDaysRemaining: null,
      nextBillingDate,
      trialEndDate,
      hasScheduledChange,
      scheduledChangeTargetPlanId: subscription.scheduled_plan_id ?? null,
    };
  }

  // Expired (no grace)
  if (subscription.status === 'expired') {
    return {
      kind: 'expired',
      label: 'Expired',
      description: 'Your subscription has expired. Choose a plan to reactivate.',
      variant: 'error',
      canUpgrade: true,
      canRenew: true,
      canCancel: false,
      trialDaysRemaining: null,
      graceDaysRemaining: null,
      nextBillingDate,
      trialEndDate,
      hasScheduledChange,
      scheduledChangeTargetPlanId: subscription.scheduled_plan_id ?? null,
    };
  }

  return defaultState;
}

export function derivePaymentStatusLabel(status: string): {
  label: string;
  description: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
} {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending',
        description: 'Payment request has been created and awaits review.',
        variant: 'info',
      };
    case 'processing':
      return {
        label: 'Processing',
        description: 'Payment is being processed.',
        variant: 'info',
      };
    case 'completed':
      return {
        label: 'Completed',
        description: 'Payment was successfully verified.',
        variant: 'success',
      };
    case 'failed':
      return {
        label: 'Failed',
        description: 'Payment was not accepted.',
        variant: 'error',
      };
    case 'verification_required':
      return {
        label: 'Verification required',
        description: 'Storefy is reviewing the payment. Plan changes apply after verification.',
        variant: 'warning',
      };
    case 'refunded':
      return {
        label: 'Refunded',
        description: 'Payment was refunded.',
        variant: 'neutral',
      };
    default:
      return {
        label: status.charAt(0).toUpperCase() + status.slice(1),
        description: 'Payment status.',
        variant: 'neutral',
      };
  }
}

export function derivePaymentPurposeLabel(purpose: string): string {
  switch (purpose) {
    case 'subscription_initial':
      return 'Initial subscription';
    case 'subscription_renewal':
      return 'Renewal';
    case 'subscription_upgrade':
      return 'Upgrade';
    case 'subscription_downgrade':
      return 'Downgrade';
    case 'manual_topup':
      return 'Manual top-up';
    case 'refund':
      return 'Refund';
    default:
      return purpose;
  }
}
