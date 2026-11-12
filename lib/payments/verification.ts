import type {
  BillingPaymentStatus,
  Payment,
  PaymentProvider,
  PaymentVerificationAudit,
} from '@/types';

export type PaymentCheckState = 'pass' | 'fail' | 'warn' | 'unknown' | 'na';
export type PaymentReviewClass = 'verified' | 'exception' | 'in_progress' | 'terminal';
export type AuditEventSource = 'system' | 'gateway' | 'admin';

export interface PaymentVerificationCheck {
  id: string;
  label: string;
  state: PaymentCheckState;
  summary: string;
  detail: string | null;
  /** Mock checks are labelled so fictional results can never be mistaken for real ones. */
  mock?: boolean;
}

export interface AuditTimelineEvent {
  id: string;
  title: string;
  timestamp: string | null;
  source: AuditEventSource;
  state: 'neutral' | 'success' | 'warning' | 'error';
  detail: string | null;
  statusChange: string | null;
}

export interface GatewayEvidence {
gateway: string | null;
  transactionId: string | null;
  paymentMethod: string | null;
  amount: string | null;
  currency: string;
  paidAt: string | null;
  gatewayReference: string | null;
  validationReference: string | null;
  serverVerification: string | null;
  /** True only when the confirmation came from a server-side gateway callback. */
  authenticated: boolean;
}

export interface ManualEvidence {
  channel: string | null;
  reference: string | null;
  sender: string | null;
  recipient: string | null;
  paidAt: string | null;
}

export interface VerificationView {
  reviewClass: PaymentReviewClass;
  status: {
    label: string;
    variant: 'success' | 'warning' | 'error' | 'info' | 'brand' | 'neutral';
    description: string;
  };
  allChecksPassed: boolean;
  hasExceptions: boolean;
  checks: {
    gatewayStatus: PaymentVerificationCheck;
    amount: PaymentVerificationCheck;
    transaction: PaymentVerificationCheck;
    duplicate: PaymentVerificationCheck;
    authenticity: PaymentVerificationCheck;
    subscription: PaymentVerificationCheck;
  };
  gateway: GatewayEvidence;
  manual: ManualEvidence;
  uploadedEvidence: string | null;
  auditEvents: AuditTimelineEvent[];
}

const paymentStatuses: BillingPaymentStatus[] = [
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'verification_required',
];

export const GATEWAY_PROVIDERS: PaymentProvider[] = ['sslcommerz', 'bkash', 'stripe'];

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return null;
}

function normalizePaymentStatus(status: string): BillingPaymentStatus {
  return paymentStatuses.includes(status as BillingPaymentStatus)
    ? (status as BillingPaymentStatus)
    : 'pending';
}

export function isGatewayPayment(provider: string): boolean {
  return GATEWAY_PROVIDERS.includes(provider as PaymentProvider);
}

export function formatMoney(amount: number | null, currency: string): string {
  if (amount === null || Number.isNaN(amount)) return 'N/A';
  return `${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export function formatTimestamp(value: string | null): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function humanize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

interface DeriveVerificationInput {
  payment: Payment;
  subscriptionStatus: string | null;
  audit: PaymentVerificationAudit[];
  /** Development-only fictional data source. Never set for real payment records. */
  mock?: { auditEvents: AuditTimelineEvent[]; reviewReason: string | null } | null;
}

export function deriveVerificationView({
  payment,
  subscriptionStatus,
  audit,
  mock,
}: DeriveVerificationInput): VerificationView {
  const status = normalizePaymentStatus(payment.status);
  const metadata = asRecord(payment.metadata);
  const gatewayName = readString(metadata, ['gateway', 'gateway_name', 'payment_gateway']);
  const isGatewayPaymentRecord = gatewayName !== null || isGatewayPayment(payment.provider);
  const currency = payment.currency;

  // --- Gateway confirmed amount / payment status -------------------------------------------
  const gatewayAmountRaw = metadata.gateway_amount ?? metadata.transaction_amount;
  const gatewayAmount =
    typeof gatewayAmountRaw === 'number'
      ? gatewayAmountRaw
      : typeof gatewayAmountRaw === 'string' && Number.isFinite(Number(gatewayAmountRaw))
        ? Number(gatewayAmountRaw)
        : null;
  const gatewayStatusRaw = readString(metadata, [
    'gateway_status',
    'gateway_payment_status',
    'bank_transaction_status',
  ]);
  const bankTransactionStatus = readString(metadata, ['bank_transaction_status']);

  // --- Transaction reference ----------------------------------------------------------------
  const gatewayTransactionId = payment.provider_transaction_id;
  const gatewayReference = readString(metadata, ['gateway_reference', 'gateway_txn_id', 'tran_id']);
  const validationReference = readString(metadata, [
    'validation_reference',
    'gateway_validation_id',
    'verification_id',
    'gw_validity',
  ]);
  const manualReference = readString(metadata, [
    'transaction_reference',
    'reference_note',
    'reference',
    'bank_transaction_id',
  ]);
  const transactionReference =
    gatewayTransactionId ?? gatewayReference ?? (isGatewayPaymentRecord ? null : manualReference);

  const authenticityRaw = readString(metadata, [
    'verification_source',
    'server_verified',
    'authenticity',
  ]);
  const authenticityState: PaymentCheckState =
    authenticityRaw !== null
      ? authenticityRaw === 'server_verified' ||
        authenticityRaw === 'authenticated' ||
        authenticityRaw === 'server_callback'
        ? 'pass'
        : authenticityRaw === 'client_redirect' || authenticityRaw === 'unauthenticated'
          ? 'fail'
          : 'unknown'
      : 'unknown';

  // --- Duplicate check ----------------------------------------------------------------------
  const duplicateRaw = readString(metadata, ['duplicate_check', 'duplicate_of']);
  const duplicateState: PaymentCheckState =
    duplicateRaw === null
      ? 'unknown'
      : duplicateRaw === 'none' || duplicateRaw === 'no_duplicate'
        ? 'pass'
        : 'fail';

  const checks: VerificationView['checks'] = {
    gatewayStatus: {
      id: 'gateway_status',
      label: 'Gateway Payment Status',
      state:
        status === 'failed'
          ? 'fail'
          : status === 'completed'
            ? 'pass'
            : status === 'refunded'
              ? 'na'
              : 'unknown',
      summary: !isGatewayPaymentRecord
        ? 'No Gateway'
        : status === 'completed'
          ? 'Confirmed'
          : status === 'failed'
            ? 'Failed'
            : status === 'refunded'
              ? 'Refunded'
              : status === 'pending' || status === 'processing' || status === 'verification_required'
                ? 'Pending'
                : 'Unknown',
      detail: !isGatewayPaymentRecord
        ? `Recorded manually through ${payment.provider}; no gateway response is available for this payment.`
        : gatewayStatusRaw ?? bankTransactionStatus,
    },
    amount: {
      id: 'amount_validation',
      label: 'Amount Validation',
      state:
        gatewayAmount === null
          ? 'unknown'
          : payment.expected_amount === null
            ? 'unknown'
            : Math.abs(gatewayAmount - payment.expected_amount) < 0.01
              ? 'pass'
              : 'fail',
      summary:
        gatewayAmount === null || payment.expected_amount === null
          ? 'Insufficient Data'
          : Math.abs(gatewayAmount - payment.expected_amount) < 0.01
            ? 'Matched'
            : 'Mismatched',
      detail:
        gatewayAmount === null || payment.expected_amount === null
          ? `Expected ${formatMoney(payment.expected_amount, currency)}; no confirmed gateway amount is stored for this payment.`
          : `Expected ${formatMoney(payment.expected_amount, currency)} · confirmed ${formatMoney(gatewayAmount, currency)}`,
    },
    transaction: {
      id: 'transaction_validation',
      label: 'Transaction Validation',
      state: transactionReference === null ? 'unknown' : 'pass',
      summary:
        transactionReference === null
          ? 'Insufficient Data'
           : isGatewayPaymentRecord
            ? validationReference
              ? 'Reference + Validation Present'
              : 'Reference Present'
            : 'Manually Supplied Reference',
      detail:
        transactionReference === null
          ? 'No transaction reference is stored for this payment.'
          : `${transactionReference}${validationReference ? ` · validation ${validationReference}` : ''}`,
    },
    duplicate: {
      id: 'duplicate_check',
      label: 'Duplicate Transaction Check',
      state: duplicateState,
      summary:
        duplicateState === 'pass'
          ? 'No Duplicate Detected'
          : duplicateState === 'fail'
            ? 'Duplicate Detected'
            : 'Check Unavailable',
      detail:
        duplicateRaw === 'none' || duplicateRaw === 'no_duplicate'
          ? 'No other payment record shares this transaction reference.'
          : duplicateRaw !== null
            ? `Matches existing payment ${duplicateRaw}.`
            : 'No duplicate check result is recorded for this payment yet.',
    },
    authenticity: {
      id: 'payment_authenticity',
      label: 'Payment Authenticity',
      state: authenticityState,
      summary:
        authenticityState === 'pass'
          ? 'Server Verified'
          : authenticityState === 'fail'
            ? 'Unauthenticated'
            : 'Not Verified',
      detail:
        authenticityRaw === null
          ? isGatewayPaymentRecord
            ? 'The stored record does not state whether the confirmation came from a server-side gateway callback.'
            : 'Manual record; nothing to authenticate against a gateway.'
          : `Recorded verification source: ${humanize(authenticityRaw)}.`,
    },
    subscription: {
      id: 'subscription_update',
      label: 'Subscription Update',
      state:
        subscriptionStatus === null
          ? 'na'
          : payment.subscription_id === null
            ? 'na'
            : status === 'completed'
              ? subscriptionStatus === 'active'
                ? 'pass'
                : 'unknown'
              : status === 'failed' || status === 'refunded'
                ? 'fail'
                : 'warn',
      summary:
        payment.subscription_id === null
          ? 'Not Applicable'
          : status === 'completed'
            ? subscriptionStatus === 'active'
              ? 'Updated'
              : 'Pending'
            : status === 'failed'
              ? 'Failed'
              : status === 'refunded'
                ? 'Not Applicable'
                : status === 'pending' || status === 'processing' || status === 'verification_required'
                  ? 'Pending'
                  : 'Failed',
      detail:
        payment.subscription_id === null
          ? 'This payment is not linked to a subscription.'
          : `Subscription status: ${subscriptionStatus === null ? 'unknown' : humanize(subscriptionStatus)}.`,
    },
  };

  const manual: ManualEvidence = {
    channel: readString(metadata, ['payment_channel', 'payment_method', 'method']),
    reference: isGatewayPaymentRecord ? null : manualReference,
    sender: readString(metadata, ['sender', 'sender_name']),
    recipient: readString(metadata, ['recipient', 'recipient_name']),
    paidAt: readString(metadata, ['payment_date', 'paid_at']),
  };

  const uploadedEvidence = readString(metadata, ['evidence_url', 'receipt_url']);
  const hasUploadedEvidence =
    uploadedEvidence !== null ||
    metadata.screenshot_attached === true ||
    metadata.receipt_attached === true;

  const gatewayEvidence: GatewayEvidence = {
    gateway: gatewayName ? humanize(gatewayName) : isGatewayPaymentRecord ? humanize(payment.provider) : null,
    transactionId: gatewayTransactionId,
    paymentMethod: readString(metadata, ['card_type', 'card_issuer', 'payment_method', 'method']) ?? manual.channel,
    amount: gatewayAmount === null ? null : formatMoney(gatewayAmount, currency),
    currency,
    paidAt: readString(metadata, ['gateway_paid_at', 'payment_date', 'paid_at']),
    gatewayReference,
    validationReference,
    serverVerification:
      readString(metadata, ['verification_source', 'server_verified']) !== null
        ? humanize(String(readString(metadata, ['verification_source', 'server_verified'])))
        : null,
    authenticated: authenticityState === 'pass',
  };

  const isException =
    Object.values(checks).some((check) => check.state === 'fail' || check.state === 'warn') ||
    (mock?.reviewReason ?? null) !== null;
  const allChecksPassed = Object.values(checks).every(
    (check) => check.state === 'pass' || check.state === 'na'
  );

  let reviewClass: PaymentReviewClass;
  if (
    status === 'completed' &&
    (isException || (mock?.reviewReason ?? null) !== null)
  ) {
    reviewClass = 'exception';
  } else if (status === 'failed' || status === 'refunded') reviewClass = 'terminal';
  else if (status === 'completed' && allChecksPassed) reviewClass = 'verified';
  else if (status === 'pending' || status === 'processing' || status === 'verification_required')
    reviewClass = 'in_progress';
  else reviewClass = 'terminal';

  const statusMeta = paymentStatusMeta(status, reviewClass, mock?.reviewReason ?? null);

  return {
    reviewClass,
    status: statusMeta,
    allChecksPassed,
    hasExceptions: isException,
    checks,
    gateway: gatewayEvidence,
    manual,
    uploadedEvidence: hasUploadedEvidence ? (uploadedEvidence ?? 'attached') : null,
    auditEvents: buildAuditEvents({ payment, audit, mockAudit: mock?.auditEvents ?? [] }),
  };
}

export function paymentStatusMeta(
  status: BillingPaymentStatus,
  reviewClass: PaymentReviewClass,
  reviewReason: string | null
): VerificationView['status'] {
  const label = reviewReason
    ? 'Requires Manual Review'
    : humanize(status);

  switch (status) {
    case 'pending':
      return {
        label,
        variant: 'warning',
        description: 'Awaiting a gateway confirmation for this payment.',
      };
    case 'processing':
      return {
        label,
        variant: 'info',
        description: 'The gateway has accepted the payment and is still processing it.',
      };
    case 'completed':
      return {
        label: reviewClass === 'exception' ? 'Verified · Exception' : label,
        variant: reviewClass === 'exception' ? 'warning' : 'success',
        description:
          reviewClass === 'exception'
            ? 'The payment is confirmed, but at least one verification check needs review.'
            : 'All available automated verification checks passed.',
      };
    case 'failed':
      return {
        label,
        variant: 'error',
        description: 'The payment did not complete and no subscription change was applied.',
      };
    case 'refunded':
      return {
        label,
        variant: 'neutral',
        description: 'This payment was refunded; it no longer grants an active subscription change.',
      };
    default:
      return {
        label,
        variant: 'warning',
        description: 'No automated verification outcome is recorded for this payment yet.',
      };
  }
}

function auditStateFromValue(value: string | null): AuditTimelineEvent['state'] {
  if (!value) return 'neutral';
  if (/fail|mismatch|duplicate|reject|unauthenticated/i.test(value)) return 'error';
  if (/pending|requested|initiated|await|unknown/i.test(value)) return 'warning';
  if (/pass|verified|updated|confirmed|complete|none/i.test(value)) return 'success';
  return 'neutral';
}

export function buildAuditEvents({
  payment,
  audit,
  mockAudit,
}: {
  payment: Payment;
  audit: PaymentVerificationAudit[];
  mockAudit: AuditTimelineEvent[];
}): AuditTimelineEvent[] {
  const events: AuditTimelineEvent[] = [
    {
      id: 'record-created',
      title: 'Payment record created',
      timestamp: payment.created_at,
      source: 'system',
      state: 'neutral',
      detail: `${humanize(payment.purpose)} · ${humanize(payment.provider)}`,
      statusChange: null,
    },
  ];

  const metadata = asRecord(payment.metadata);
  const gatewayStatus = readString(metadata, ['gateway_status', 'gateway_payment_status']);
  if (gatewayStatus) {
    events.push({
      id: 'gateway-response',
      title: 'Gateway response stored',
      timestamp: readString(metadata, ['gateway_response_at']) ?? payment.updated_at,
      source: 'gateway',
      state: auditStateFromValue(gatewayStatus),
      detail: humanize(gatewayStatus),
      statusChange: null,
    });
  }

  for (const record of audit) {
    events.push({
      id: record.id,
      title: record.decision === 'approved' ? 'Manual approval recorded' : 'Manual rejection recorded',
      timestamp: record.created_at,
      source: 'admin',
      state: record.decision === 'approved' ? 'success' : 'error',
      detail: record.reason,
      statusChange: record.previous_status && record.new_status
        ? `${humanize(record.previous_status)} → ${humanize(record.new_status)}`
        : null,
    });
  }

  return [...events, ...mockAudit].sort((left, right) => {
    const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : 0;
    const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : 0;
    return rightTime - leftTime;
  });
}

export const auditEventSourceMeta: Record<
  AuditEventSource,
  { label: string; className: string }
> = {
  system: { label: 'System', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  gateway: { label: 'Gateway', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  admin: { label: 'Admin', className: 'bg-violet-50 text-violet-700 border-violet-200' },
};

export const checkStateMeta: Record<
  PaymentCheckState,
  { label: string; wrap: string; text: string; dot: string }
> = {
  pass: {
    label: 'Pass',
    wrap: 'border-emerald-200 bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  fail: {
    label: 'Fail',
    wrap: 'border-red-200 bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  warn: {
    label: 'Review',
    wrap: 'border-amber-200 bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  unknown: {
    label: 'Unknown',
    wrap: 'border-slate-200 bg-slate-50',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
  },
  na: {
    label: 'N/A',
    wrap: 'border-slate-200 bg-slate-50',
    text: 'text-slate-500',
    dot: 'bg-slate-300',
  },
};