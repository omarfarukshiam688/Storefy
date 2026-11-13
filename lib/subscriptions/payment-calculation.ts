import { addMonths, differenceInDays, max, toDate } from 'date-fns';

export type PlanPrice = { priceMonthly: number; isActive: boolean };

export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ProrationInputs {
  currentPlanPrice: number;
  targetPlanPrice: number;
  currentPeriodStart: string | Date;
  currentPeriodEnd: string | Date;
  now: string | Date;
}

export interface ProrationResult {
  amount: number; // server-calculated prorated upgrade amount (BDT, 2 decimals)
  priceDifference: number;
  remainingDays: number;
  totalDays: number;
  fraction: number;
}

/**
 * Calculate the prorated upgrade amount per the accepted policy:
 *   (New Plan Price - Current Plan Price) x (Remaining Billing Days / Total Billing Cycle Days)
 * All inputs are trusted server-side values; nothing here is derived from the client.
 */
export function prorateUpgradeAmount(inputs: ProrationInputs): ProrationResult {
  const { currentPlanPrice, targetPlanPrice, currentPeriodStart, currentPeriodEnd, now } = inputs;

  if (!Number.isFinite(currentPlanPrice) || !Number.isFinite(targetPlanPrice)) {
    throw new Error('Invalid plan prices');
  }

  const priceDifference = targetPlanPrice - currentPlanPrice;
  if (priceDifference <= 0) {
    throw new Error('Target plan must have a higher monthly price than the current plan');
  }

  const start = toDate(currentPeriodStart);
  const end = toDate(currentPeriodEnd);
  const nowDate = toDate(now);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || isNaN(nowDate.getTime())) {
    throw new Error('Invalid billing period dates');
  }

  const totalDays = differenceInDays(end, start);
  if (totalDays <= 0) {
    throw new Error('Invalid billing cycle: total days must be positive');
  }

  const remainingDays = Math.max(0, differenceInDays(end, nowDate));
  const fraction = remainingDays / totalDays;
  const amount = Math.round((priceDifference * fraction) * 100) / 100;

  return {
    amount,
    priceDifference,
    remainingDays,
    totalDays,
    fraction,
  };
}

export interface RenewalPeriodInputs {
  currentPeriodEnd: string | Date;
  now: string | Date;
}

export interface RenewalPeriodResult {
  renewalPeriodStart: Date;
  renewalPeriodEnd: Date;
  isCatchUp: boolean; // true when the subscription was already overdue at creation time
}

/**
 * Establish deterministic renewal period bounds per migration 046 policy:
 *   renewal_period_start = greatest(subscription.current_period_end, creation_time)
 *   renewal_period_end   = renewal_period_start + 1 month
 * Approval-time now() is never used, so delayed manual verification remains valid.
 */
export function computeRenewalPeriod(inputs: RenewalPeriodInputs): RenewalPeriodResult {
  const currentPeriodEnd = toDate(inputs.currentPeriodEnd);
  const nowDate = toDate(inputs.now);

  if (isNaN(currentPeriodEnd.getTime()) || isNaN(nowDate.getTime())) {
    throw new Error('Invalid period dates');
  }

  const renewalPeriodStart = max([currentPeriodEnd, nowDate]);
  const renewalPeriodEnd = addMonths(renewalPeriodStart, 1);

  return {
    renewalPeriodStart,
    renewalPeriodEnd,
    isCatchUp: nowDate > currentPeriodEnd,
  };
}

export function toISO(date: Date | string): string {
  return toDate(date).toISOString();
}
