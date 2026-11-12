'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CreditCard,
  Building2,
  CheckCircle2,
  XCircle,
  Shield,
  List,
  Loader2,
  AlertTriangle,
  Clock,
  Copy,
  ChevronDown,
  ChevronUp,
  FileWarning,
  ScanSearch,
  Ban,
  Landmark,
  Receipt,
  Fingerprint,
  RefreshCcw,
  ServerCog,
  SearchCheck,
} from 'lucide-react';
import type { Payment, PaymentVerificationAudit } from '@/types';
import {
  deriveVerificationView,
  formatMoney,
  formatTimestamp,
  humanize,
  isGatewayPayment,
  checkStateMeta,
  auditEventSourceMeta,
  type AuditEventSource,
  type PaymentVerificationCheck,
  type VerificationView,
} from '@/lib/payments/verification';
import {
  getMockScenario,
  MOCK_PAYMENT_ID,
  MOCK_SCENARIOS,
  type MockScenarioId,
  type MockPaymentView,
} from '@/lib/payments/verification-mock';

interface PaymentDetailsClientProps {
  paymentId: string;
}

interface PaymentWithRelations extends Payment {
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
}

interface SubscriptionDetail {
  id: string;
  plan_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  scheduled_plan_id: string | null;
  scheduled_plan_change_at: string | null;
  plan: {
    name: string | null;
    price_monthly: number | null;
    is_active: boolean | null;
  } | null;
}

interface PaymentData {
  payment: PaymentWithRelations;
  subscription: SubscriptionDetail | null;
  audit: PaymentVerificationAudit[];
}

function StatusBadge({
  status,
  variant = 'neutral',
}: {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'brand' | 'neutral';
}) {
  const variantStyles: Record<string, string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    error: 'border-red-200 bg-red-50 text-red-700',
    info: 'border-sky-200 bg-sky-50 text-sky-700',
    brand: 'border-violet-200 bg-violet-50 text-violet-700',
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]}`}
    >
      {humanize(status)}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{children}</p>;
}

function HelperText({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs leading-relaxed text-slate-500">{children}</p>;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Unable to copy ${label.toLowerCase()}`);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-slate-500 hover:text-violet-700"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
    >
      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
    </Button>
  );
}

const checkStateIcon = {
  pass: CheckCircle2,
  fail: XCircle,
  warn: AlertTriangle,
  unknown: Clock,
  na: Ban,
};

const auditStateStyle: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-600',
  warning: 'bg-amber-100 text-amber-600',
  error: 'bg-red-100 text-red-600',
  neutral: 'bg-slate-100 text-slate-600',
};

const reviewClassMeta: Record<
  VerificationView['reviewClass'],
  { label: string; description: string; className: string }
> = {
  verified: {
    label: 'Automatically Verified',
    description: 'No Super Admin action is required for this payment.',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  in_progress: {
    label: 'Verification In Progress',
    description: 'Automated verification has not completed for this payment.',
    className: 'border-sky-200 bg-sky-50 text-sky-800',
  },
  exception: {
    label: 'Exception · Super Admin Review',
    description: 'One or more checks need review before this payment is trusted.',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  terminal: {
    label: 'No Action Required',
    description: 'This payment reached a terminal state; only read-only actions are available.',
    className: 'border-slate-200 bg-slate-50 text-slate-700',
  },
};

export default function PaymentDetailsClient({ paymentId }: PaymentDetailsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = React.useState<PaymentData | null>(null);
  const [mockAuditEvents, setMockAuditEvents] = React.useState<VerificationView['auditEvents']>([]);
  const [mockReviewReason, setMockReviewReason] = React.useState<string | null>(null);
  const [mockScenario, setMockScenario] = React.useState<MockScenarioId>('verified');
  const [loading, setLoading] = React.useState(true);
  const [verifying, setVerifying] = React.useState<{ paymentId: string; decision: string } | null>(null);
  const [auditLoadError, setAuditLoadError] = React.useState<string | null>(null);
  const [technicalOpen, setTechnicalOpen] = React.useState(false);
  const [metadataOpen, setMetadataOpen] = React.useState(false);

  const [approveDialogOpen, setApproveDialogOpen] = React.useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');

  const previewEnabled = searchParams.get('preview') === 'true';
  const requestedScenario = searchParams.get('scenario');
  const isMockPreview =
    process.env.NODE_ENV === 'development' && previewEnabled && paymentId === MOCK_PAYMENT_ID;

  const fetchPaymentData = React.useCallback(async () => {
    // The mock preview never touches the network.
    if (isMockPreview) return;

    setAuditLoadError(null);

    const [paymentResult, auditResult] = await Promise.allSettled([
      fetch(`/api/platform/payments/${paymentId}`),
      fetch(`/api/platform/payments/${paymentId}/audit`),
    ]);

    if (paymentResult.status === 'rejected') {
      throw new Error('Failed to load payment');
    }

    const paymentRes = paymentResult.value;

    if (!paymentRes.ok) {
      if (paymentRes.status === 404) {
        toast.error('Payment not found');
        router.push('/platform/payments');
        return;
      }
      throw new Error('Failed to load payment');
    }

    const paymentData = await paymentRes.json();

    let audit: PaymentVerificationAudit[] = [];
    if (auditResult.status === 'fulfilled' && auditResult.value.ok) {
      const auditData = await auditResult.value.json();
      audit = auditData.audit || [];
    } else {
      setAuditLoadError('Verification audit history could not be loaded.');
    }

    setData({
      payment: paymentData.payment,
      subscription: paymentData.subscription ?? null,
      audit,
    });
  }, [isMockPreview, paymentId, router]);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (cancelled) return;
      setLoading(true);
      try {
        if (isMockPreview) {
          const scenario = getMockScenario(requestedScenario);
          setAuditLoadError(null);
          setMockScenario(scenario.scenarioId);
          setMockAuditEvents(scenario.auditEvents);
          setMockReviewReason(scenario.reviewReason);
          setData({
            payment: scenario.payment as MockPaymentView['payment'],
            subscription: scenario.subscription,
            audit: scenario.audit,
          });
          return;
        }

        setMockAuditEvents([]);
        setMockReviewReason(null);
        await fetchPaymentData();
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load payment details');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [fetchPaymentData, isMockPreview, requestedScenario]);

  async function handleVerify(decision: 'approved' | 'rejected', reason: string | null) {
    if (isMockPreview) {
      toast.info('Actions are disabled in preview mode. No verification request was sent.');
      return;
    }

    setVerifying({ paymentId, decision });
    try {
      const response = await fetch(`/api/platform/payments/${paymentId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Payment ${decision} failed`);
      }

      toast.success(`Payment ${decision}`);

      if (decision === 'approved') {
        setApproveDialogOpen(false);
      } else {
        setRejectDialogOpen(false);
        setRejectReason('');
      }

      await fetchPaymentData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${decision} payment`);
    } finally {
      setVerifying(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-sm text-slate-500">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-500">Unable to load payment.</p>
      </div>
    );
  }

  const { payment, subscription, audit } = data;
  const verification = deriveVerificationView({
    payment,
    subscriptionStatus: subscription?.status ?? null,
    audit,
    mock: isMockPreview ? { auditEvents: mockAuditEvents, reviewReason: mockReviewReason } : null,
  });

  const isGateway = isGatewayPayment(payment.provider) || verification.gateway.gateway !== null;
  const canManualVerify = !isMockPreview && payment.status === 'verification_required';
  const reviewMeta = reviewClassMeta[verification.reviewClass];
  const checks: PaymentVerificationCheck[] = [
    verification.checks.gatewayStatus,
    verification.checks.amount,
    verification.checks.transaction,
    verification.checks.duplicate,
    verification.checks.authenticity,
    verification.checks.subscription,
  ];
  const failedChecks = checks.filter((check) => check.state === 'fail' || check.state === 'warn');

  const purposeLabel = (purpose: string) => {
    switch (purpose) {
      case 'subscription_upgrade':
        return 'Subscription Upgrade';
      case 'subscription_renewal':
        return 'Subscription Renewal';
      case 'subscription_initial':
        return 'Initial Subscription';
      case 'subscription_downgrade':
        return 'Subscription Downgrade';
      case 'manual_topup':
        return 'Manual Top-up';
      case 'refund':
        return 'Refund';
      default:
        return humanize(purpose);
    }
  };

  const sortedAudit = verification.auditEvents;

  const uploadedAttachment =
    typeof payment.metadata?.evidence_url === 'string'
      ? payment.metadata.evidence_url
      : typeof payment.metadata?.receipt_url === 'string'
        ? payment.metadata.receipt_url
        : null;

  const ChevronIcon = metadataOpen ? ChevronUp : ChevronDown;

  const evidenceRow = (label: string, value: string | null, copyLabel?: string) =>
    value ? (
      <div className="col-span-12 sm:col-span-6">
        <FieldLabel>{label}</FieldLabel>
        {copyLabel ? (
          <div className="flex items-center gap-1">
            <p className="truncate font-mono text-sm text-slate-900">{value}</p>
            <CopyButton value={value} label={copyLabel} />
          </div>
        ) : (
          <p className="break-words text-sm text-slate-900">{value}</p>
        )}
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      {isMockPreview && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">
                Mock Preview Mode (development only) · {MOCK_SCENARIOS.find((s) => s.id === mockScenario)?.label}
              </p>
              <p className="text-xs text-amber-700">
                Fictional data for UI inspection. Payment and audit APIs, verification actions, and database
                mutations are bypassed.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {MOCK_SCENARIOS.map((entry) => (
              <Button
                key={entry.id}
                type="button"
                size="sm"
                variant="outline"
                title={entry.hint}
                className={
                  entry.id === mockScenario
                    ? 'h-7 border-amber-300 bg-white px-2.5 text-xs font-medium text-amber-900'
                    : 'h-7 border-amber-200 bg-transparent px-2.5 text-xs font-medium text-amber-800 hover:bg-white'
                }
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('scenario', entry.id);
                  router.replace(`/platform/payments/${paymentId}?${params.toString()}`);
                }}
              >
                {entry.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <section className="relative overflow-hidden rounded-xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-600 via-indigo-500 to-violet-400" />
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 flex flex-col gap-4 xl:col-span-8">
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm" className="h-8 gap-2">
                <a href="/platform/payments">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Payments
                </a>
              </Button>
              <StatusBadge status={verification.status.label} variant={verification.status.variant} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Super Admin · Automated Verification
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                Payment Verification
              </h1>
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-900">{payment.tenant?.name ?? 'Unknown Tenant'}</span>
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="break-all font-mono text-xs text-slate-500">{payment.id}</span>
                <CopyButton value={payment.id} label="Payment ID" />
              </div>
            </div>
          </div>
          <div className="col-span-12 flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 xl:col-span-4">
            <div>
              <FieldLabel>Amount</FieldLabel>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight text-slate-900">
                  {Number(payment.amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-sm font-medium uppercase text-slate-500">{payment.currency}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Expected {formatMoney(payment.expected_amount, payment.currency)}
              </p>
            </div>
            <div
              className={`rounded-lg border px-3 py-2 ${reviewMeta.className}`}
              role="status"
            >
              <p className="text-xs font-semibold">{reviewMeta.label}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">{reviewMeta.description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Business Information */}
      <Card className="border border-slate-200 bg-slate-50/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
              <Building2 className="h-4 w-4" />
            </span>
            <CardTitle className="text-sm font-semibold text-slate-900">Business Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 sm:col-span-6 lg:col-span-3">
              <FieldLabel>Business Name</FieldLabel>
              <p className="text-sm font-medium text-slate-900">{payment.tenant?.name ?? 'Unknown Tenant'}</p>
            </div>
            <div className="col-span-12 sm:col-span-6 lg:col-span-4">
              <FieldLabel>Tenant ID</FieldLabel>
              <div className="flex items-center gap-1">
                <p className="truncate font-mono text-sm text-slate-700">{payment.tenant_id}</p>
                <CopyButton value={payment.tenant_id} label="Tenant ID" />
              </div>
            </div>
            <div className="col-span-12 sm:col-span-6 lg:col-span-3">
              <FieldLabel>Store Slug</FieldLabel>
              <p className="font-mono text-sm text-slate-700">/{payment.tenant?.slug ?? '-'}</p>
            </div>
            <div className="col-span-12 sm:col-span-6 lg:col-span-2">
              <FieldLabel>Tenant Status</FieldLabel>
              <StatusBadge status={payment.tenant?.is_active ? 'active' : 'inactive'} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Information Grid */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-7">
          <Card className="h-full border border-indigo-200 bg-indigo-50/40 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
                  <CreditCard className="h-4 w-4" />
                </span>
                <CardTitle className="text-sm font-semibold text-slate-900">Payment Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-700">Primary</p>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 rounded-lg border border-indigo-100 bg-white/70 p-4 sm:col-span-6">
                    <FieldLabel>Amount</FieldLabel>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold tracking-tight text-slate-900">
                        {Number(payment.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-sm font-medium uppercase text-slate-500">{payment.currency}</span>
                    </div>
                  </div>
                  <div className="col-span-12 rounded-lg border border-indigo-100 bg-white/70 p-4 sm:col-span-6">
                    <FieldLabel>Expected Amount</FieldLabel>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatMoney(payment.expected_amount, payment.currency)}
                    </p>
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    <FieldLabel>Payment Purpose</FieldLabel>
                    <p className="text-sm font-medium text-slate-900">{purposeLabel(payment.purpose)}</p>
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    <FieldLabel>Payment Status</FieldLabel>
                    <StatusBadge status={payment.status} variant={verification.status.variant} />
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    <FieldLabel>Gateway</FieldLabel>
                    <p className="text-sm text-slate-900">
                      {verification.gateway.gateway ?? `${humanize(payment.provider)} (manual record)`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4">
                <p className="mb-2 text-xs font-semibold text-slate-700">Record Dates</p>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 sm:col-span-6">
                    <FieldLabel>Record Created</FieldLabel>
                    <p className="text-sm text-slate-700">{formatTimestamp(payment.created_at)}</p>
                  </div>
                  <div className="col-span-12 sm:col-span-6">
                    <FieldLabel>Last Updated</FieldLabel>
                    <p className="text-sm text-slate-700">{formatTimestamp(payment.updated_at)}</p>
                  </div>
                </div>
              </div>

              {verification.status.description && (
                <div className="border-t border-border/60 pt-4">
                  <FieldLabel>Verification State</FieldLabel>
                  <p className="text-sm text-slate-700">{verification.status.description}</p>
                  {payment.failure_reason && (
                    <p className="mt-2 text-sm text-red-700">Failure reason: {payment.failure_reason}</p>
                  )}
                  {payment.verification_notes && (
                    <p className="mt-2 text-sm text-slate-700">Notes: {payment.verification_notes}</p>
                  )}
                </div>
              )}

              <div className="border-t border-border/60 pt-4">
                <button
                  type="button"
                  onClick={() => setTechnicalOpen((value) => !value)}
                  className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left text-sm font-medium text-slate-700 hover:text-slate-900"
                  aria-expanded={technicalOpen}
                >
                  <span>Technical Details</span>
                  {technicalOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {technicalOpen && (
                  <div className="mt-3 grid grid-cols-12 gap-4 rounded-lg border border-indigo-100 bg-white/60 p-4">
                    <div className="col-span-12">
                      <FieldLabel>Idempotency Key</FieldLabel>
                      <div className="flex items-center gap-1">
                        <p className="break-all font-mono text-xs text-slate-600">{payment.idempotency_key}</p>
                        <CopyButton value={payment.idempotency_key} label="Idempotency key" />
                      </div>
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                      <FieldLabel>Payment ID</FieldLabel>
                      <p className="break-all font-mono text-xs text-slate-600">{payment.id}</p>
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                      <FieldLabel>Target Plan ID</FieldLabel>
                      <p className="break-all font-mono text-xs text-slate-600">
                        {payment.target_plan_id ?? 'N/A'}
                      </p>
                    </div>
                    {payment.verified_at && (
                      <div className="col-span-12 sm:col-span-6">
                        <FieldLabel>Verification Timestamp</FieldLabel>
                        <p className="text-sm text-slate-700">{formatTimestamp(payment.verified_at)}</p>
                      </div>
                    )}
                    {payment.verified_by && (
                      <div className="col-span-12 sm:col-span-6">
                        <FieldLabel>Verified By</FieldLabel>
                        <p className="break-all font-mono text-xs text-slate-600">{payment.verified_by}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 xl:col-span-5">
          <Card className="h-full border border-violet-200 bg-violet-50/40 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-100 text-violet-600">
                  <Shield className="h-4 w-4" />
                </span>
                <CardTitle className="text-sm font-semibold text-slate-900">Subscription Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 sm:col-span-6">
                      <FieldLabel>Current Plan</FieldLabel>
                      <p className="text-sm font-medium text-slate-900">
                        {subscription.plan?.name ?? 'Unknown Plan'}
                      </p>
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                      <FieldLabel>Target Plan</FieldLabel>
                      <p className="text-sm font-medium text-slate-900">
                        {payment.target_plan?.name ?? 'N/A'}
                      </p>
                    </div>
                    <div className="col-span-12">
                      <FieldLabel>Subscription Status</FieldLabel>
                      <StatusBadge status={subscription.status} />
                    </div>
                  </div>
                  <div className="space-y-4 rounded-lg border border-violet-100 bg-white/60 p-4">
                    <div>
                      <FieldLabel>Billing Period</FieldLabel>
                      <p className="font-mono text-sm text-slate-700">
                        {formatTimestamp(subscription.current_period_start)} –{' '}
                        {formatTimestamp(subscription.current_period_end)}
                      </p>
                      <HelperText>The current subscription billing cycle.</HelperText>
                    </div>
                    <div>
                      <FieldLabel>Renewal Period</FieldLabel>
                      {payment.renewal_period_start && payment.renewal_period_end ? (
                        <p className="font-mono text-sm text-slate-700">
                          {formatTimestamp(payment.renewal_period_start)} –{' '}
                          {formatTimestamp(payment.renewal_period_end)}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-500">N/A</p>
                      )}
                      <HelperText>
                        The next subscription billing cycle that begins after a verified renewal.
                      </HelperText>
                    </div>
                    <div>
                      <FieldLabel>Scheduled Plan Change</FieldLabel>
                      {subscription.scheduled_plan_id ? (
                        <p className="break-all font-mono text-sm text-slate-700">
                          {subscription.scheduled_plan_id} at{' '}
                          {formatTimestamp(subscription.scheduled_plan_change_at)}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-500">None scheduled</p>
                      )}
                      <HelperText>
                        A plan change scheduled to take effect once this payment is trusted.
                      </HelperText>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center">
                  <AlertTriangle className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="mt-3 text-sm font-medium text-slate-900">No linked subscription</p>
                  <p className="mt-1 text-xs text-slate-500">
                    This payment is not associated with a subscription record.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Automated Verification Summary */}
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                <ScanSearch className="h-4 w-4" />
              </span>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Automated Verification Summary
              </CardTitle>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
              {checks.filter((check) => check.state === 'pass').length} of {checks.length} checks passed
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-3">
            {checks.map((check) => {
              const meta = checkStateMeta[check.state];
              const Icon = checkStateIcon[check.state];
              return (
                <div
                  key={check.id}
                  className={`col-span-12 rounded-lg border p-4 sm:col-span-6 xl:col-span-4 ${meta.wrap}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-700">{check.label}</p>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-white/70 bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${meta.text}`}
                    >
                      <Icon className="h-3 w-3" aria-hidden="true" />
                      {check.summary}
                    </span>
                  </div>
                  {check.detail && (
                    <p className="mt-2 break-words text-xs leading-relaxed text-slate-600">{check.detail}</p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            A recorded transaction reference is not proof of payment. Only server-validated gateway
            confirmations count as verified.
          </p>
        </CardContent>
      </Card>

      {/* Payment Evidence & Exception Notice */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <Card className="h-full border border-cyan-200 bg-cyan-50/40 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-100 text-cyan-700">
                  <FileWarning className="h-4 w-4" />
                </span>
                <CardTitle className="text-sm font-semibold text-slate-900">Payment Evidence</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Landmark className="h-3.5 w-3.5 text-slate-500" />
                  <p className="text-xs font-semibold text-slate-700">Gateway Transaction Information</p>
                </div>
                {isGateway ? (
                  verification.gateway.transactionId ||
                  verification.gateway.gatewayReference ||
                  verification.gateway.validationReference ||
                  verification.gateway.amount ? (
                    <div className="grid grid-cols-12 gap-4 rounded-lg border border-cyan-100 bg-white/70 p-4">
                      {evidenceRow(
                        'Gateway Transaction ID',
                        verification.gateway.transactionId,
                        'gateway transaction ID'
                      )}
                      {evidenceRow('Payment Method', verification.gateway.paymentMethod)}
                      {evidenceRow('Amount', verification.gateway.amount)}
                      {evidenceRow(
                        'Payment Timestamp',
                        verification.gateway.paidAt && formatTimestamp(verification.gateway.paidAt)
                      )}
                      {evidenceRow(
                        'Gateway Reference',
                        verification.gateway.gatewayReference,
                        'gateway reference'
                      )}
                      {evidenceRow(
                        'Gateway Validation Reference',
                        verification.gateway.validationReference,
                        'gateway validation reference'
                      )}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-cyan-200 bg-white/60 px-4 py-3 text-sm text-slate-500">
                      No gateway transaction information is stored for this payment yet.
                    </p>
                  )
                ) : (
                  <div className="rounded-lg border border-cyan-100 bg-white/70 p-4">
                    <p className="text-sm text-slate-700">
                      This payment was recorded through {humanize(payment.provider)} rather than a payment
                      gateway. No gateway transaction information exists.
                    </p>
                  </div>
                )}
              </div>

              {!isGateway &&
                (uploadedAttachment !== null ||
                  payment.metadata?.screenshot_attached === true ||
                  payment.metadata?.receipt_attached === true) && (
                  <div className="border-t border-cyan-100 pt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Receipt className="h-3.5 w-3.5 text-slate-500" />
                      <p className="text-xs font-semibold text-slate-700">Customer-Uploaded Evidence</p>
                    </div>
                    <div className="rounded-lg border border-cyan-100 bg-white/70 p-4">
                      <FieldLabel>Evidence Attachment / Receipt</FieldLabel>
                      {uploadedAttachment ? (
                        <a
                          href={uploadedAttachment}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-violet-700 underline underline-offset-2"
                        >
                          View attachment
                        </a>
                      ) : (
                        <p className="text-sm text-slate-900">Attachment recorded for this payment.</p>
                      )}
                    </div>
                  </div>
                )}

              {!isGateway && (verification.manual.reference || verification.manual.sender || verification.manual.recipient) && (
                <div className="border-t border-cyan-100 pt-4">
                  <p className="mb-2 text-xs font-semibold text-slate-700">Manually Supplied Details</p>
                  <div className="grid grid-cols-12 gap-4 rounded-lg border border-cyan-100 bg-white/70 p-4">
                    {evidenceRow(
                      'Payment Channel / Method',
                      verification.manual.channel && humanize(verification.manual.channel)
                    )}
                    {evidenceRow('Supplied Reference', verification.manual.reference)}
                    {evidenceRow('Sender Information', verification.manual.sender)}
                    {evidenceRow('Recipient Information', verification.manual.recipient)}
                    {evidenceRow(
                      'Supplied Payment Date/Time',
                      verification.manual.paidAt && formatTimestamp(verification.manual.paidAt)
                    )}
                  </div>
                  <HelperText>These values were entered manually and are not gateway-confirmed.</HelperText>
                </div>
              )}

              <div className="border-t border-cyan-100 pt-4">
                <div className="mb-2 flex items-center gap-2">
                  <ServerCog className="h-3.5 w-3.5 text-slate-500" />
                  <p className="text-xs font-semibold text-slate-700">Server-Side Verification Result</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      verification.gateway.authenticated
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Fingerprint className="h-3 w-3" aria-hidden="true" />
                    {verification.gateway.authenticated ? 'Server Verified' : 'Not Server Verified'}
                  </span>
                  <span className="text-xs text-slate-600">
                    {verification.gateway.serverVerification ??
                      'No server-side validation result is recorded for this payment.'}
                  </span>
                </div>
                <HelperText>
                  A browser success redirect is not treated as proof of payment authenticity.
                </HelperText>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <Card className="h-full border border-slate-200 bg-slate-50/40 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                  <SearchCheck className="h-4 w-4" />
                </span>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Super Admin Action
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`rounded-lg border px-4 py-3 ${reviewMeta.className}`}>
                <p className="text-sm font-semibold">{reviewMeta.label}</p>
                <p className="mt-1 text-xs leading-relaxed opacity-90">{reviewMeta.description}</p>
                {verification.hasExceptions && failedChecks.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {failedChecks.map((check) => (
                      <li key={check.id} className="text-xs leading-relaxed">
                        <span className="font-semibold">{check.label}:</span> {check.summary}
                        {check.detail ? ` — ${check.detail}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
                  onClick={() => setReviewDialogOpen(true)}
                >
                  <SearchCheck className="h-4 w-4" />
                  View Verification Details
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    if (isMockPreview) {
                      toast.info('Actions are disabled in preview mode.');
                      return;
                    }
                    toast.info('Marking a payment for investigation is not available yet.');
                  }}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Mark for Investigation
                  <span className="ml-auto text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
                    Unavailable
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  disabled
                >
                  <RefreshCcw className="h-4 w-4" />
                  Retry Verification
                  <span className="ml-auto text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
                    Unavailable
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  disabled
                >
                  <Receipt className="h-4 w-4" />
                  Review Refund Status
                  <span className="ml-auto text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
                    Unavailable
                  </span>
                </Button>
              </div>

              {canManualVerify ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-900">Manual payment record</p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-800">
                    This record predates automated gateway verification and is still awaiting a manual
                    decision. Approving or rejecting it uses the existing verified approval RPC.
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      className="w-full border-violet-200 text-violet-700 hover:bg-violet-50"
                      onClick={() => setApproveDialogOpen(true)}
                      disabled={verifying?.paymentId === paymentId && verifying?.decision === 'approved'}
                    >
                      {verifying?.paymentId === paymentId && verifying?.decision === 'approved'
                        ? 'Approving...'
                        : 'Approve Payment'}
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setRejectDialogOpen(true)}
                      disabled={verifying?.paymentId === paymentId && verifying?.decision === 'rejected'}
                    >
                      {verifying?.paymentId === paymentId && verifying?.decision === 'rejected'
                        ? 'Rejecting...'
                        : 'Reject Payment'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border/60 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-700">Automated workflow</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    This payment does not require a manual approve/reject decision. Successful gateway
                    payments are verified automatically; Super Admin only reviews exceptions.
                  </p>
                </div>
              )}

              {isMockPreview && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-medium text-amber-800">
                    Mock preview: no API request is sent and no database record is changed.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Metadata */}
      {payment.metadata && Object.keys(payment.metadata).length > 0 && (
        <Card className="border border-slate-200 bg-slate-50/30 shadow-sm">
          <button
            type="button"
            onClick={() => setMetadataOpen((value) => !value)}
            aria-expanded={metadataOpen}
            aria-controls="payment-metadata-panel"
            className="flex w-full items-center justify-between gap-2 rounded-xl px-6 py-4 text-left transition-colors duration-200 hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                <List className="h-4 w-4" />
              </span>
              <CardTitle className="text-sm font-semibold text-slate-900">Payment Metadata</CardTitle>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500">
                {Object.keys(payment.metadata).length} fields
              </span>
            </span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
              {metadataOpen ? 'Hide' : 'Show'}
              <ChevronIcon className="h-4 w-4 transition-transform duration-200" />
            </span>
          </button>
          <div
            id="payment-metadata-panel"
            role="region"
            aria-label="Payment metadata"
            className={`grid transition-all duration-300 ease-out motion-reduce:transition-none ${
              metadataOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="mx-6 mb-4 grid grid-cols-12 gap-x-4 gap-y-2 border-t border-border/60 pt-3">
                {Object.entries(payment.metadata).map(([key, value]) => (
                  <div
                    key={key}
                    className="col-span-12 flex items-start justify-between gap-4 border-b border-border/50 py-2 text-sm last:border-b-0 sm:col-span-6"
                  >
                    <dt className="capitalize text-slate-500">{key.replace(/_/g, ' ')}</dt>
                    <dd className="max-w-[260px] break-words text-right font-mono text-xs text-slate-900">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </dd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Audit Trail */}
      <Card className="border border-slate-200 bg-slate-50/30 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
              <Clock className="h-4 w-4" />
            </span>
            <CardTitle className="text-sm font-semibold text-slate-900">Audit Trail</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {auditLoadError && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {auditLoadError}
            </div>
          )}
          {sortedAudit.length === 0 ? (
            <div className="py-10 text-center">
              <AlertTriangle className="mx-auto h-6 w-6 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-900">No recorded events</p>
              <p className="mt-1 text-xs text-slate-500">
                No verification events are stored for this payment.
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {sortedAudit.map((event, index) => {
                const isLast = index === sortedAudit.length - 1;
                const sourceMeta = auditEventSourceMeta[event.source as AuditEventSource] ?? auditEventSourceMeta.system;
                return (
                  <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {!isLast && (
                      <span
                        className="absolute left-4 top-9 h-[calc(100%-1.25rem)] w-px bg-slate-200"
                        aria-hidden="true"
                      />
                    )}
                    <div
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        auditStateStyle[event.state] ?? auditStateStyle.neutral
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1 rounded-lg border border-border/60 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{event.title}</span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${sourceMeta.className}`}
                          >
                            {sourceMeta.label}
                          </span>
                          {event.statusChange && (
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
                              {event.statusChange}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">
                          {event.timestamp ? formatTimestamp(event.timestamp) : 'Timestamp unavailable'}
                        </span>
                      </div>
                      {event.detail && <p className="mt-1 text-sm text-slate-700">{event.detail}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Details Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Verification Details</DialogTitle>
            <DialogDescription>
              Every check derived from the data stored for this payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {checks.map((check) => {
              const meta = checkStateMeta[check.state];
              const Icon = checkStateIcon[check.state];
              return (
                <div key={check.id} className="rounded-lg border border-border/60 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">{check.label}</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${meta.text}`}>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {check.summary}
                    </span>
                  </div>
                  {check.detail && <p className="mt-1 text-xs text-slate-600">{check.detail}</p>}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Payment</DialogTitle>
            <DialogDescription>
              Confirm approval of this manual subscription payment for{' '}
              <span className="font-medium">{payment.tenant?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Approving is a consequential action. Review the amount, evidence, and subscription impact
              before confirming.
            </div>
            <div className="rounded-lg border border-border/60 bg-slate-50 p-4">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Payment Summary
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Tenant</span>
                <span className="font-medium text-slate-900">{payment.tenant?.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Type</span>
                <span className="font-medium text-slate-900">{purposeLabel(payment.purpose)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Amount</span>
                <span className="font-medium text-slate-900">
                  {formatMoney(payment.amount, payment.currency)}
                </span>
              </div>
              {payment.target_plan && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Target Plan</span>
                  <span className="font-medium text-slate-900">{payment.target_plan.name}</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500">
              Approving this payment applies the subscription change according to existing business logic.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)} size="sm">
              Cancel
            </Button>
            <Button
              onClick={() => handleVerify('approved', null)}
              disabled={verifying?.paymentId === paymentId && verifying?.decision === 'approved'}
              size="sm"
            >
              {verifying?.paymentId === paymentId && verifying?.decision === 'approved'
                ? 'Approving...'
                : 'Confirm Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>A reason is required to reject this payment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              Rejecting is a consequential action. Provide a clear reason; this action affects payment
              verification records.
            </div>
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Enter reason for rejection..."
                rows={4}
                className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-4 py-3 text-base shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} size="sm">
              Cancel
            </Button>
            <Button
              onClick={() => handleVerify('rejected', rejectReason.trim() || null)}
              disabled={
                !rejectReason.trim() ||
                (verifying?.paymentId === paymentId && verifying?.decision === 'rejected')
              }
              size="sm"
            >
              {verifying?.paymentId === paymentId && verifying?.decision === 'rejected'
                ? 'Rejecting...'
                : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}