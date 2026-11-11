'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
} from 'lucide-react';

interface PaymentDetailsClientProps {
  paymentId: string;
}

interface PaymentData {
  payment: {
    id: string;
    tenant_id: string;
    subscription_id: string | null;
    purpose: string;
    provider: string;
    amount: number;
    currency: string;
    status: string;
    provider_transaction_id: string | null;
    idempotency_key: string;
    metadata: Record<string, unknown>;
    verified_by: string | null;
    verified_at: string | null;
    failure_reason: string | null;
    verification_notes: string | null;
    renewal_period_start: string | null;
    renewal_period_end: string | null;
    target_plan_id: string | null;
    expected_amount: number | null;
    created_at: string;
    updated_at: string;
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
  subscription: {
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
  } | null;
  audit: Array<{
    id: string;
    payment_id: string;
    admin_user_id: string;
    decision: string;
    previous_status: string | null;
    new_status: string | null;
    reason: string | null;
    created_at: string;
  }>;
}

export default function PaymentDetailsClient({ paymentId }: PaymentDetailsClientProps) {
  const router = useRouter();
  const [data, setData] = React.useState<PaymentData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [verifying, setVerifying] = React.useState<{ paymentId: string; decision: string } | null>(null);

  const [approveDialogOpen, setApproveDialogOpen] = React.useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');

  const fetchPaymentData = async () => {
    const [paymentRes, auditRes] = await Promise.all([
      fetch(`/api/platform/payments/${paymentId}`),
      fetch(`/api/platform/payments/${paymentId}/audit`),
    ]);

    if (!paymentRes.ok) {
      if (paymentRes.status === 404) {
        toast.error('Payment not found');
        router.push('/platform/payments');
        return;
      }
      throw new Error('Failed to load payment');
    }

    const paymentData = await paymentRes.json();
    const auditData = await auditRes.json();

    setData({
      payment: paymentData.payment,
      subscription: paymentData.subscription,
      audit: auditData.audit || [],
    });
  };

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (cancelled) return;
      setLoading(true);
      try {
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
    return () => { cancelled = true; };
  }, [paymentId, router]);

  async function handleVerify(decision: 'approved' | 'rejected', reason: string | null) {
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

      setVerifying(null);
      await fetchPaymentData();
    } catch (error) {
      setVerifying(null);
      toast.error(error instanceof Error ? error.message : `Failed to ${decision} payment`);
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
  const canVerify = payment.status === 'verification_required';
  const shortId = (id: string) => `${id.slice(0, 8)}...`;

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
        return purpose.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  const formatCurrency = (amount: number | null, currency: string) => {
    if (amount === null) return 'N/A';
    return Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ` ${currency}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const statusVariant = (status: string): 'success' | 'warning' | 'error' | 'neutral' => {
    switch (status) {
      case 'completed':
      case 'succeeded':
        return 'success';
      case 'verification_required':
      case 'pending':
        return 'warning';
      case 'failed':
      case 'rejected':
        return 'error';
      case 'refunded':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="flex items-center gap-2 px-3"
          >
            <a href="/platform/payments">
              <ArrowLeft className="h-4 w-4" />
              Back to Payments
            </a>
          </Button>
        </div>
        <div className="flex flex-col gap-1 flex-1 max-w-xl">
          <div className="flex items-center gap-2">
            <span className={`inline-flex h-6 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
              statusVariant(payment.status) === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : statusVariant(payment.status) === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : statusVariant(payment.status) === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}>
              {payment.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Payment Verification
          </h1>
          <p className="text-sm text-slate-500">
            Review payment #{shortId(payment.id)} for {payment.tenant?.name ?? 'Unknown Tenant'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canVerify && (
            <>
              <Button
                variant="outline"
                onClick={() => setApproveDialogOpen(true)}
                disabled={verifying?.paymentId === paymentId && verifying?.decision === 'approved'}
              >
                {verifying?.paymentId === paymentId && verifying?.decision === 'approved'
                  ? 'Approving...'
                  : 'Approve Payment'}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setRejectDialogOpen(true)}
                disabled={verifying?.paymentId === paymentId && verifying?.decision === 'rejected'}
              >
                {verifying?.paymentId === paymentId && verifying?.decision === 'rejected'
                  ? 'Rejecting...'
                  : 'Reject Payment'}
              </Button>
            </>
          )}
          {!canVerify && (
            <Button variant="outline" disabled>
              Already Processed
            </Button>
          )}
        </div>
      </section>

      {/* Information Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Business Information (full width on lg, stacked on smaller) */}
        <div className="lg:col-span-3 space-y-3">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-500" />
                <CardTitle className="text-sm font-semibold text-slate-900">Business Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                    Business Name
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {payment.tenant?.name ?? 'Unknown Tenant'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                    Tenant ID
                  </p>
                  <p className="text-sm text-slate-600 font-mono truncate">
                    {payment.tenant_id}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                    Slug
                  </p>
                  <p className="text-sm text-slate-600 font-mono">
                    /{payment.tenant?.slug ?? '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                    Status
                  </p>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                    payment.tenant?.is_active ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {payment.tenant?.is_active ? <span>Active</span> : <span>Inactive</span>}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Information */}
        <div className="lg:col-span-2 space-y-3">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-500" />
                <CardTitle className="text-sm font-semibold text-slate-900">Payment Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                    Payment ID
                  </p>
                  <p className="text-sm font-medium text-slate-900 font-mono truncate">
                    {payment.id}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                    Type
                  </p>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 shadow-sm">
                    {purposeLabel(payment.purpose)}
                  </span>
                </div>
                <div className="col-span-full">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                    Amount
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-slate-900">
                      {Number(payment.amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-sm text-slate-500 uppercase">
                      {payment.currency}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                    Expected Amount
                  </p>
                  <p className="text-sm text-slate-600">
                    {payment.expected_amount === null ? 'N/A' : Number(payment.expected_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ` ${payment.currency}`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                    Provider
                  </p>
                  <p className="text-sm text-slate-600 capitalize">
                    {payment.provider}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                    Status
                  </p>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    statusVariant(payment.status) === 'warning'
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : statusVariant(payment.status) === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : statusVariant(payment.status) === 'error'
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}>
                    {payment.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>
                {payment.provider_transaction_id && (
                  <div className="col-span-full">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                      Provider Transaction ID
                    </p>
                    <p className="text-sm text-slate-600 font-mono truncate">
                      {payment.provider_transaction_id}
                    </p>
                  </div>
                )}
                {payment.idempotency_key && (
                  <div className="col-span-full">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                      Idempotency Key
                    </p>
                    <p className="text-xs text-slate-500 font-mono truncate">
                      {payment.idempotency_key}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                    Created
                  </p>
                  <p className="text-sm text-slate-600 font-mono">
                    {formatDate(payment.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                    Updated
                  </p>
                  <p className="text-sm text-slate-600 font-mono">
                    {formatDate(payment.updated_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Information */}
        {subscription && (
          <div className="lg:col-span-2 space-y-3">
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-slate-500" />
                  <CardTitle className="text-sm font-semibold text-slate-900">Subscription</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                      Current Plan
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {subscription.plan?.name ?? 'Unknown Plan'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                      Target Plan
                    </p>
                    <p className="text-sm text-slate-600">
                      {payment.target_plan?.name ?? 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                      Subscription Status
                    </p>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      statusVariant(subscription.status) === 'warning'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : statusVariant(subscription.status) === 'success'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : statusVariant(subscription.status) === 'error'
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}>
                      {subscription.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                      Billing Period
                    </p>
                    <p className="text-sm text-slate-600 font-mono">
                      {formatDate(subscription.current_period_start)} – {formatDate(subscription.current_period_end)}
                    </p>
                  </div>
                  {payment.renewal_period_start && payment.renewal_period_end && (
                    <div className="col-span-full">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                        Renewal Period
                      </p>
                      <p className="text-sm text-slate-600 font-mono">
                        {formatDate(payment.renewal_period_start)} – {formatDate(payment.renewal_period_end)}
                      </p>
                    </div>
                  )}
                  {subscription.scheduled_plan_id && (
                    <div className="col-span-full">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-1">
                        Scheduled Plan Change
                      </p>
                      <p className="text-sm text-slate-600 font-mono">
                        {subscription.scheduled_plan_id} at {formatDate(subscription.scheduled_plan_change_at)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Metadata */}
      {payment.metadata && Object.keys(payment.metadata).length > 0 && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <List className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-sm font-semibold text-slate-900">Metadata</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(payment.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 text-sm border-b border-border/50 last:border-b-0">
                  <dt className="text-slate-500 capitalize">
                    {key.replace(/_/g, ' ')}
                  </dt>
                  <dd className="text-slate-900 font-mono text-xs truncate max-w-[200px]">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </dd>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Audit Trail */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-sm font-semibold text-slate-900">Verification Audit Trail</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {audit.length === 0 ? (
            <div className="py-10 text-center">
              <AlertTriangle className="mx-auto h-6 w-6 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-900">
                No verification history
              </p>
              <p className="mt-1 text-xs text-slate-500">
                This payment has not been approved or rejected yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {audit.map((record) => (
                <div
                  key={record.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-slate-25/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full ${
                    record.decision === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                  }">
                    {record.decision === 'approved' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-900">
                        Admin {record.admin_user_id.slice(0, 8)}…
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(record.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`text-[10px] font-semibold ${
                        record.decision === 'approved' ? 'text-emerald-600' : 'text-red-600'
                      } uppercase tracking-[0.1em]`}>
                        {record.decision}
                      </span>
                      {record.previous_status && record.new_status && (
                        <span className="text-[10px] text-slate-400">
                          {record.previous_status} → {record.new_status}
                        </span>
                      )}
                    </div>
                    {record.reason && (
                      <p className="mt-1 text-xs text-slate-600 italic">
                        &ldquo;{record.reason}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Payment</DialogTitle>
            <DialogDescription>
              Confirm approval of this subscription payment for{' '}
              <span className="font-medium">{payment.tenant?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-slate-25 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-3">
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
                  {formatCurrency(payment.amount, payment.currency)}
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
              Approving this payment will activate the subscription and move it to the target plan (if an upgrade).
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
                ? 'Approving…'
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
            <DialogDescription>
              A reason is required to reject this payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-slate-25 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-3">
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
                  {formatCurrency(payment.amount, payment.currency)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <Input
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="min-h-[80px]"
              />
              <p className="text-[10px] text-slate-500">
                Please explain why this payment is being rejected.
              </p>
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
                ? 'Rejecting…'
                : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
