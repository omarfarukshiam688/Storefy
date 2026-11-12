import type { Payment, PaymentVerificationAudit } from '@/types';
import type { AuditTimelineEvent } from '@/lib/payments/verification';

/**
 * Development-only mock scenarios for the automated payment verification UI.
 *
 * These records are fictional. They are never persisted, never sent to an API,
 * and never read from Supabase. The UI only loads them when NODE_ENV is
 * 'development', the preview query flag is set, and the id is exactly
 * MOCK_PAYMENT_ID.
 */

export const MOCK_PAYMENT_ID = 'mock-payment-id';

export type MockScenarioId =
  | 'verified'
  | 'pending'
  | 'failed'
  | 'review'
  | 'refunded';

export const MOCK_SCENARIOS: Array<{ id: MockScenarioId; label: string; hint: string }> = [
  { id: 'verified', label: 'Successfully Verified', hint: 'All automated checks passed' },
  { id: 'pending', label: 'Pending Payment', hint: 'Gateway confirmation not received yet' },
  { id: 'failed', label: 'Failed Payment', hint: 'Gateway reported a failure' },
  { id: 'review', label: 'Manual Review Required', hint: 'Amount mismatch detected' },
  { id: 'refunded', label: 'Refunded Payment', hint: 'Refund completed, subscription cancelled' },
];

interface MockPaymentRecord {
  payment: Partial<Payment> & Pick<Payment, 'status'>;
  subscription: {
    id: string;
    plan_id: string;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    scheduled_plan_id: string | null;
    scheduled_plan_change_at: string | null;
    plan: { name: string | null; price_monthly: number | null; is_active: boolean | null } | null;
  } | null;
  auditEvents: AuditTimelineEvent[];
  reviewReason: string | null;
}

const basePayment: Payment = {
  id: MOCK_PAYMENT_ID,
  tenant_id: 'mock-tenant-0001',
  subscription_id: 'mock-subscription-0001',
  purpose: 'subscription_upgrade',
  provider: 'sslcommerz',
  amount: 2000,
  currency: 'BDT',
  status: 'verification_required',
  provider_transaction_id: 'MOCK-GW-TXN-0001',
  idempotency_key: 'mock-idempotency-key-0001-preview-only',
  metadata: {},
  verified_by: null,
  verified_at: null,
  failure_reason: null,
  verification_notes: null,
  renewal_period_start: null,
  renewal_period_end: null,
  target_plan_id: 'mock-plan-growth-001',
  expected_amount: 2000,
  created_at: '2026-11-12T09:15:00.000Z',
  updated_at: '2026-11-12T09:20:00.000Z',
};

const starterSubscription = {
  id: 'mock-subscription-0001',
  plan_id: 'mock-plan-starter-001',
  status: 'active',
  current_period_start: '2026-10-12T00:00:00.000Z',
  current_period_end: '2026-11-12T00:00:00.000Z',
  scheduled_plan_id: 'mock-plan-growth-001',
  scheduled_plan_change_at: '2026-11-12T00:00:00.000Z',
  plan: { name: 'Starter (Mock)', price_monthly: 1000, is_active: true },
};

const tenant = {
  name: 'Fictional Harbor Supplies',
  slug: 'fictional-harbor-supplies',
  plan_id: 'mock-plan-starter-001',
  is_active: true,
};

const targetPlan = { name: 'Growth (Mock)', price_monthly: 2000, is_active: true };

export interface MockScenario extends MockPaymentRecord {
  id: MockScenarioId;
  payment: Payment;
}

function scenario(id: MockScenarioId, overrides: Partial<MockPaymentRecord>): MockScenario {
  return {
    id,
    ...overrides,
    payment: {
      ...basePayment,
      ...overrides.payment,
      metadata: { ...basePayment.metadata, ...overrides.payment?.metadata },
    },
    subscription: overrides.subscription === undefined ? starterSubscription : overrides.subscription,
    auditEvents: overrides.auditEvents ?? [],
    reviewReason: overrides.reviewReason ?? null,
  };
}

export const MOCK_SCENARIO_DATA: Record<MockScenarioId, MockScenario> = {
  verified: scenario('verified', {
    payment: {
      status: 'completed',
      verified_at: '2026-11-12T09:20:00.000Z',
      verification_notes: 'Server-side gateway callback authenticated; all automated checks passed.',
      metadata: {
        gateway: 'sslcommerz',
        gateway_status: 'VALID',
        gateway_amount: 2000,
        card_type: 'VISA ···· 4242',
        gateway_reference: 'MOCK-GW-REF-0001',
        validation_reference: 'MOCK-VALID-0001',
        verification_source: 'server_callback',
        duplicate_check: 'none',
        gateway_paid_at: '2026-11-12T09:19:00.000Z',
      },
    },
    subscription: {
      ...starterSubscription,
      status: 'active',
      plan_id: 'mock-plan-growth-001',
      plan: targetPlan,
      scheduled_plan_id: null,
      scheduled_plan_change_at: null,
    },
    auditEvents: [
      {
        id: 'mock-verified-initiated',
        title: 'Payment initiated',
        timestamp: '2026-11-12T09:15:00.000Z',
        source: 'system',
        state: 'neutral',
        detail: 'Checkout session created for tenant upgrade.',
        statusChange: null,
      },
      {
        id: 'mock-verified-gateway',
        title: 'Gateway response received',
        timestamp: '2026-11-12T09:19:00.000Z',
        source: 'gateway',
        state: 'success',
        detail: 'Gateway reported a successful authorization.',
        statusChange: null,
      },
      {
        id: 'mock-verified-authenticated',
        title: 'Payment authenticity verified',
        timestamp: '2026-11-12T09:20:00.000Z',
        source: 'system',
        state: 'success',
        detail: 'Server-side callback validation succeeded; browser redirect was not used as proof.',
        statusChange: null,
      },
      {
        id: 'mock-verified-subscription',
        title: 'Subscription updated',
        timestamp: '2026-11-12T09:20:00.000Z',
        source: 'system',
        state: 'success',
        detail: 'Subscription moved to the Growth (Mock) plan.',
        statusChange: 'Verification Required → Completed',
      },
    ],
  }),
  pending: scenario('pending', {
    payment: {
      status: 'pending',
      provider_transaction_id: 'MOCK-GW-TXN-0002',
      metadata: {
        gateway_status: 'PENDING',
        gateway_reference: 'MOCK-GW-REF-0002',
        verification_source: null,
      },
    },
    auditEvents: [
      {
        id: 'mock-pending-initiated',
        title: 'Payment initiated',
        timestamp: '2026-11-12T10:02:00.000Z',
        source: 'system',
        state: 'neutral',
        detail: 'Checkout session created; awaiting customer completion.',
        statusChange: null,
      },
      {
        id: 'mock-pending-awaiting',
        title: 'Awaiting gateway confirmation',
        timestamp: '2026-11-12T10:04:00.000Z',
        source: 'gateway',
        state: 'warning',
        detail: 'No terminal gateway response has been stored for this payment.',
        statusChange: null,
      },
    ],
  }),
  failed: scenario('failed', {
    payment: {
      status: 'failed',
      provider_transaction_id: 'MOCK-GW-TXN-0003',
      failure_reason: 'Gateway declined the transaction (insufficient funds).',
      metadata: {
        gateway_status: 'FAILED',
        bank_transaction_status: 'Declined',
        gateway_reference: 'MOCK-GW-REF-0003',
        verification_source: 'server_callback',
      },
    },
    auditEvents: [
      {
        id: 'mock-failed-initiated',
        title: 'Payment initiated',
        timestamp: '2026-11-12T11:10:00.000Z',
        source: 'system',
        state: 'neutral',
        detail: 'Checkout session created.',
        statusChange: null,
      },
      {
        id: 'mock-failed-gateway',
        title: 'Gateway response received',
        timestamp: '2026-11-12T11:12:00.000Z',
        source: 'gateway',
        state: 'error',
        detail: 'Gateway reported a declined transaction.',
        statusChange: 'Verification Required → Failed',
      },
    ],
  }),
  review: scenario('review', {
    payment: {
      id: MOCK_PAYMENT_ID,
      status: 'completed',
      provider_transaction_id: 'MOCK-GW-TXN-0004',
      amount: 1500,
      expected_amount: 2000,
      verified_at: '2026-11-12T12:30:00.000Z',
      verification_notes: 'Amount received is lower than the expected upgrade amount.',
      metadata: {
        gateway_status: 'VALID',
        gateway_amount: 1500,
        gateway_reference: 'MOCK-GW-REF-0004',
        validation_reference: 'MOCK-VALID-0004',
        verification_source: 'server_callback',
        duplicate_check: 'none',
      },
    },
    reviewReason: 'Gateway amount is 500.00 BDT lower than the expected amount.',
    auditEvents: [
      {
        id: 'mock-review-gateway',
        title: 'Gateway payment confirmed',
        timestamp: '2026-11-12T12:29:00.000Z',
        source: 'gateway',
        state: 'success',
        detail: 'Gateway confirmed a payment of 1,500.00 BDT.',
        statusChange: null,
      },
      {
        id: 'mock-review-mismatch',
        title: 'Amount mismatch detected',
        timestamp: '2026-11-12T12:30:00.000Z',
        source: 'system',
        state: 'error',
        detail: 'Expected 2,000.00 BDT but the gateway confirmed 1,500.00 BDT.',
        statusChange: null,
      },
      {
        id: 'mock-review-requested',
        title: 'Manual review requested',
        timestamp: '2026-11-12T12:30:00.000Z',
        source: 'system',
        state: 'warning',
        detail: 'Payment held for Super Admin review; the subscription was not updated.',
        statusChange: null,
      },
    ],
  }),
  refunded: scenario('refunded', {
    payment: {
      status: 'refunded',
      provider_transaction_id: 'MOCK-GW-TXN-0005',
      verified_at: '2026-11-05T06:00:00.000Z',
      metadata: {
        gateway_status: 'REFUNDED',
        gateway_amount: 2000,
        gateway_reference: 'MOCK-GW-REF-0005',
        validation_reference: 'MOCK-VALID-0005',
        verification_source: 'server_callback',
        duplicate_check: 'none',
        refund_reference: 'MOCK-REFUND-0005',
        refunded_at: '2026-11-10T08:00:00.000Z',
        refund_amount: 2000,
      },
    },
    subscription: {
      ...starterSubscription,
      status: 'canceled',
      plan_id: 'mock-plan-starter-001',
      plan: { name: 'Starter (Mock)', price_monthly: 1000, is_active: true },
      scheduled_plan_id: null,
      scheduled_plan_change_at: null,
    },
    auditEvents: [
      {
        id: 'mock-refund-initial',
        title: 'Gateway payment confirmed',
        timestamp: '2026-11-05T06:00:00.000Z',
        source: 'gateway',
        state: 'success',
        detail: 'Gateway confirmed the original payment.',
        statusChange: null,
      },
      {
        id: 'mock-refund-initiated',
        title: 'Refund initiated',
        timestamp: '2026-11-10T07:55:00.000Z',
        source: 'admin',
        state: 'warning',
        detail: 'Refund requested from the payment provider.',
        statusChange: null,
      },
      {
        id: 'mock-refund-completed',
        title: 'Refund completed',
        timestamp: '2026-11-10T08:00:00.000Z',
        source: 'gateway',
        state: 'success',
        detail: 'Provider confirmed the refund of 2,000.00 BDT.',
        statusChange: 'Completed → Refunded',
      },
    ],
  }),
};

export interface MockPaymentView {
  payment: Payment & {
    tenant: {
      name: string | null;
      slug: string | null;
      plan_id: string | null;
      is_active: boolean | null;
    } | null;
    target_plan: {
      name: string | null;
      price_monthly: number | null;
      is_active: boolean | null;
    } | null;
  };
  subscription: MockScenario['subscription'];
  audit: PaymentVerificationAudit[];
  auditEvents: AuditTimelineEvent[];
  reviewReason: string | null;
  scenarioId: MockScenarioId;
  scenarioLabel: string;
}

export function getMockScenario(scenarioId: string | null): MockPaymentView {
  const selected = MOCK_SCENARIOS.some((entry) => entry.id === scenarioId)
    ? (scenarioId as MockScenarioId)
    : 'verified';
  const record = MOCK_SCENARIO_DATA[selected];

  return {
    payment: { ...record.payment, tenant, target_plan: targetPlan },
    subscription: record.subscription,
    audit: [],
    auditEvents: record.auditEvents,
    reviewReason: record.reviewReason,
    scenarioId: record.id,
    scenarioLabel: MOCK_SCENARIOS.find((entry) => entry.id === record.id)?.label ?? record.id,
  };
}