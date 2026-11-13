import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createServiceClient } from '@/lib/supabase/admin';
import { getTenantContext, requireSuperAdmin } from '@/lib/auth/tenant';
import { AuthError, ForbiddenError } from '@/lib/auth/errors';
import {
  computeRenewalPeriod,
  prorateUpgradeAmount,
  toISO,
} from '@/lib/subscriptions/payment-calculation';
import type { Plan, Subscription } from '@/types';

const PAYMENT_PROVIDER = 'manual';
const PAYMENT_CURRENCY = 'BDT';
const PAYMENT_STATUS = 'verification_required';

export class PaymentRequestError extends Error {
  constructor(public statusCode: number, public errorCode: string, message: string) {
    super(message);
    this.name = 'PaymentRequestError';
  }
}

export type PaymentType = 'upgrade' | 'renewal';

export interface CreatePaymentInput {
  type: PaymentType;
  targetPlanId?: string;
}

export interface CreatedPayment {
  id: string;
  status: string;
  purpose: string;
  amount: number;
  expectedAmount: number | null;
  currency: string;
  targetPlanId: string | null;
  renewalPeriodStart: string | null;
  renewalPeriodEnd: string | null;
  idempotent: boolean;
}

export interface AuthorizedTenant {
  tenantId: string;
  isSuperAdmin: boolean;
}

/**
 * Derive tenant identity exclusively from authenticated server-side context.
 * The client is never allowed to supply a tenant ID, subscription ID, or amount.
 */
export async function authorizeTenant(): Promise<AuthorizedTenant> {
  const ctx = await getTenantContext(); // throws AuthError when unauthenticated

  if (!ctx.activeTenant) {
    throw new ForbiddenError('No active tenant context');
  }

  const isTenantAdmin = ctx.role === 'tenant_admin';

  let isSuperAdmin = false;
  try {
    await requireSuperAdmin(); // queries public.super_admins for auth.uid()
    isSuperAdmin = true;
  } catch {
    // not a super admin; fall through to tenant-admin check below
  }

  if (!isTenantAdmin && !isSuperAdmin) {
    throw new ForbiddenError('Tenant admin or super admin access required');
  }

  return { tenantId: ctx.activeTenant.id, isSuperAdmin };
}

async function fetchSubscription(
  supabase: ReturnType<typeof createServiceClient>,
  tenantId: string
): Promise<Subscription & { plan: Plan | null }> {
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*, plan:plans(*)')
    .eq('tenant_id', tenantId)
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new PaymentRequestError(500, 'DB_ERROR', 'Failed to load subscription');
  }

  if (!subscription) {
    throw new PaymentRequestError(404, 'SUBSCRIPTION_NOT_FOUND', 'No subscription found for this tenant');
  }

  return subscription as Subscription & { plan: Plan | null };
}

async function fetchPlan(
  supabase: ReturnType<typeof createServiceClient>,
  planId: string
): Promise<Plan> {
  const { data: plan, error } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error || !plan) {
    throw new PaymentRequestError(404, 'PLAN_NOT_FOUND', 'Plan not found');
  }

  return plan as Plan;
}

function findExistingPaymentByIdempotencyKey(
  supabase: ReturnType<typeof createServiceClient>,
  idempotencyKey: string
) {
  return supabase
    .from('payments')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
}

function toCreatedPayment(row: unknown, idempotent: boolean): CreatedPayment {
  const payment = row as Record<string, unknown>;
  return {
    id: payment.id as string,
    status: payment.status as string,
    purpose: payment.purpose as string,
    amount: Number(payment.amount),
    expectedAmount: payment.expected_amount == null ? null : Number(payment.expected_amount),
    currency: payment.currency as string,
    targetPlanId: (payment.target_plan_id as string) ?? null,
    renewalPeriodStart: (payment.renewal_period_start as string) ?? null,
    renewalPeriodEnd: (payment.renewal_period_end as string) ?? null,
    idempotent,
  };
}

/**
 * Create a trusted subscription upgrade payment.
 *
 * Flow:
 *  1. Validate the tenant's active subscription and the requested target plan.
 *  2. Verify the target plan is active and the transition is permitted (higher-priced plan).
 *  3. Calculate the prorated amount server-side; client amounts are never trusted.
 *  4. Schedule the plan change on the subscription (scheduled_plan_id / scheduled_plan_change_at)
 *     WITHOUT activating the new plan. Activation happens only when a Super Admin approves
 *     the payment via public.approve_or_reject_payment().
 *  5. Insert a verification_required payment bound to target_plan_id and expected_amount.
 *     Idempotent: repeated requests return the existing payment.
 */
export async function createUpgradePayment(input: CreatePaymentInput): Promise<CreatedPayment> {
  const { targetPlanId } = input;

  if (!targetPlanId || typeof targetPlanId !== 'string') {
    throw new PaymentRequestError(400, 'VALIDATION_ERROR', 'targetPlanId is required');
  }

  const { tenantId } = await authorizeTenant();
  const supabase = createServiceClient();

  const subscription = await fetchSubscription(supabase, tenantId);

  if (subscription.status !== 'active') {
    throw new PaymentRequestError(
      422,
      'INVALID_SUBSCRIPTION_STATE',
      `Subscription cannot be upgraded from status: ${subscription.status}`
    );
  }

  const currentPlan = subscription.plan ?? (await fetchPlan(supabase, subscription.plan_id));
  if (!currentPlan.is_active) {
    throw new PaymentRequestError(422, 'CURRENT_PLAN_INACTIVE', 'Current plan is not active');
  }

  const targetPlan = await fetchPlan(supabase, targetPlanId);

  if (targetPlan.id === currentPlan.id) {
    throw new PaymentRequestError(400, 'SAME_PLAN', 'Already subscribed to the target plan');
  }

  if (targetPlan.is_active !== true) {
    throw new PaymentRequestError(422, 'TARGET_PLAN_INACTIVE', 'Target plan is not active');
  }

  if (Number(targetPlan.price_monthly) <= Number(currentPlan.price_monthly)) {
    throw new PaymentRequestError(
      422,
      'INVALID_UPGRADE_TRANSITION',
      'Upgrade target must have a higher monthly price than the current plan'
    );
  }

  // Idempotency: check for an existing payment for this subscription + target plan.
  // Pending payments are returned idempotently; failed payments allow a new attempt;
  // completed payments prevent duplicate upgrade processing.
  const idempotencyKey = `sub_upgrade:${subscription.id}:${targetPlanId}`;
  const { data: existing } = await findExistingPaymentByIdempotencyKey(supabase, idempotencyKey);

  if (existing) {
    const existingStatus = existing.status as string;
    if (existingStatus === 'verification_required' || existingStatus === 'completed') {
      return toCreatedPayment(existing, true);
    }
    // existingStatus === 'failed': fall through to create a new payment with a fresh key
  }

  // For retries after rejection/failure, generate a fresh idempotency key because the
  // original key is still held by the failed payment record.
  const finalIdempotencyKey = existing?.status === 'failed'
    ? `sub_upgrade:${subscription.id}:${targetPlanId}:retry:${randomUUID()}`
    : idempotencyKey;

  const now = new Date();
  const proration = prorateUpgradeAmount({
    currentPlanPrice: Number(currentPlan.price_monthly),
    targetPlanPrice: Number(targetPlan.price_monthly),
    currentPeriodStart: subscription.current_period_start,
    currentPeriodEnd: subscription.current_period_end,
    now,
  });

  const metadata = {
    source: 'subscription_upgrade_v2_2',
    current_plan_id: currentPlan.id,
    target_plan_id: targetPlan.id,
    price_difference: proration.priceDifference,
    remaining_days: proration.remainingDays,
    total_days: proration.totalDays,
    calculated_at: now.toISOString(),
    retry: existing?.status === 'failed',
  };

  // Atomic RPC: subscription scheduled-plan UPDATE + payment INSERT in one transaction.
  // Any failure rolls back the entire operation.
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    'create_subscription_upgrade_payment',
    {
      p_subscription_id: subscription.id,
      p_target_plan_id: targetPlanId,
      p_amount: proration.amount,
      p_expected_amount: proration.amount,
      p_currency: PAYMENT_CURRENCY,
      p_idempotency_key: finalIdempotencyKey,
      p_metadata: metadata,
    }
  );

  if (rpcError) {
    throw new PaymentRequestError(500, 'DB_ERROR', 'Failed to create payment');
  }

  const result = rpcResult as Record<string, unknown>;

  if (!(result.success === true)) {
    const errorCode = result.error_code as string;

    if (errorCode === 'IDEMPOTENCY_CONFLICT') {
      // Concurrent request created the payment; recover it under either key
      const { data: recovered } = await findExistingPaymentByIdempotencyKey(supabase, finalIdempotencyKey);
      if (recovered) {
        return toCreatedPayment(recovered, true);
      }
      const { data: recoveredOriginal } = await findExistingPaymentByIdempotencyKey(supabase, idempotencyKey);
      if (recoveredOriginal) {
        return toCreatedPayment(recoveredOriginal, true);
      }
    }

    if (errorCode === 'PLAN_CHANGE_ALREADY_SCHEDULED') {
      // A concurrent request won the scheduled-plan slot. If it was for the same
      // plan with a pending payment, return it idempotently.
      const { data: reloaded } = await supabase
        .from('subscriptions')
        .select('scheduled_plan_id')
        .eq('id', subscription.id)
        .single();

      if (reloaded?.scheduled_plan_id === targetPlanId) {
        const { data: existingPayment } = await findExistingPaymentByIdempotencyKey(supabase, idempotencyKey);
        if (existingPayment && existingPayment.status === 'verification_required') {
          return toCreatedPayment(existingPayment, true);
        }
      }

      throw new PaymentRequestError(
        409,
        'PLAN_CHANGE_ALREADY_SCHEDULED',
        'A plan change is already scheduled for this subscription. Resolve the existing scheduled change before requesting another.'
      );
    }

    throw new PaymentRequestError(422, errorCode, result.error as string);
  }

  return {
    id: result.payment_id as string,
    status: result.status as string,
    purpose: result.purpose as string,
    amount: Number(result.amount),
    expectedAmount: result.expected_amount == null ? null : Number(result.expected_amount),
    currency: result.currency as string,
    targetPlanId: result.target_plan_id as string,
    renewalPeriodStart: null,
    renewalPeriodEnd: null,
    idempotent: result.idempotent === true,
  };
}

/**
 * Create a trusted subscription renewal payment.
 *
 * Flow:
 *  1. Validate the subscription and renewal eligibility (status per approve_or_reject_payment).
 *  2. Calculate the full monthly plan amount server-side.
 *  3. Establish deterministic renewal_period_start/end:
 *        start = greatest(current_period_end, now)
 *        end   = start + 1 month
 *     Never derived from approval time; catch-up-from-now applies when overdue.
 *  4. Insert a verification_required payment. Idempotent per subscription + renewal period
 *     (enforced by idempotency key and the unique index on subscription_id + renewal_period_end).
 *     Approving the payment extends the subscription to the trusted period.
 */
export async function createRenewalPayment(): Promise<CreatedPayment> {
  const { tenantId } = await authorizeTenant();
  const supabase = createServiceClient();

  const allowedStatuses = ['active', 'trialing', 'past_due', 'canceled', 'expired'];

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*, plan:plans(*)')
    .eq('tenant_id', tenantId)
    .in('status', allowedStatuses)
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new PaymentRequestError(500, 'DB_ERROR', 'Failed to load subscription');
  }

  if (!subscription) {
    throw new PaymentRequestError(
      404,
      'SUBSCRIPTION_NOT_FOUND',
      'No renewable subscription found for this tenant'
    );
  }

  const currentPlan = subscription.plan ?? (await fetchPlan(supabase, subscription.plan_id));
  if (!currentPlan) {
    throw new PaymentRequestError(404, 'PLAN_NOT_FOUND', 'Current plan not found');
  }

  const now = new Date();
  const period = computeRenewalPeriod({
    currentPeriodEnd: subscription.current_period_end,
    now,
  });

  // Deterministic, server-owned idempotency key for this subscription + period.
  const idempotencyKey = `sub_renewal:${subscription.id}:${toISO(period.renewalPeriodEnd)}`;

  const { data: existing } = await findExistingPaymentByIdempotencyKey(supabase, idempotencyKey);
  if (existing) {
    return toCreatedPayment(existing, true);
  }

  const fullAmount = Math.round(Number(currentPlan.price_monthly) * 100) / 100;

  const insertPayload = {
    tenant_id: tenantId,
    subscription_id: subscription.id,
    purpose: 'subscription_renewal' as const,
    provider: PAYMENT_PROVIDER,
    amount: fullAmount,
    currency: PAYMENT_CURRENCY,
    status: PAYMENT_STATUS,
    idempotency_key: idempotencyKey,
    target_plan_id: null,
    expected_amount: fullAmount,
    renewal_period_start: toISO(period.renewalPeriodStart),
    renewal_period_end: toISO(period.renewalPeriodEnd),
    metadata: {
      source: 'subscription_renewal_v2_2',
      plan_id: currentPlan.id,
      plan_price: fullAmount,
      is_catch_up: period.isCatchUp,
      calculated_at: now.toISOString(),
    },
  };

  const { data: payment, error: insertError } = await supabase
    .from('payments')
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      // Unique index on (subscription_id, renewal_period_end) or idempotency_key collision
      const { data: recovered } = await supabase
        .from('payments')
        .select('*')
        .eq('subscription_id', subscription.id)
        .eq('purpose', 'subscription_renewal')
        .eq('renewal_period_end', toISO(period.renewalPeriodEnd))
        .maybeSingle();
      if (recovered) {
        return toCreatedPayment(recovered, true);
      }
    }
    throw new PaymentRequestError(500, 'DB_ERROR', 'Failed to create payment');
  }

  return toCreatedPayment(payment, false);
}

/**
 * Map service-layer errors to HTTP responses without leaking internal details.
 */
export function handlePaymentError(error: unknown): NextResponse {
  if (error instanceof PaymentRequestError) {
    return NextResponse.json({ error: error.message, error_code: error.errorCode }, { status: error.statusCode });
  }

  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  console.error('Subscription payment error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
