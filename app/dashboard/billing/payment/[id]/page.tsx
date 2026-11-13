import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/auth/session';
import { getTenantContext } from '@/lib/auth/tenant';
import { ForbiddenError } from '@/lib/auth/errors';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatBDT, formatDateISO, formatDateTimeISO } from '@/lib/billing/format-currency';
import { derivePaymentStatusLabel, derivePaymentPurposeLabel } from '@/lib/billing/subscription-state';
import type { Payment } from '@/types';

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let user;
  try {
    user = await requireAuthUser();
  } catch {
    redirect('/login');
  }

  if (!user.email_confirmed_at) {
    redirect('/verify-email');
  }

  let context;
  try {
    context = await getTenantContext();
  } catch (error) {
    if (error instanceof ForbiddenError) {
      redirect('/login');
    }
    throw error;
  }

  if (!context.activeTenant) {
    redirect('/dashboard/onboarding');
  }

  if (context.role !== 'tenant_admin') {
    redirect('/dashboard/billing');
  }

  const tenantId = context.activeTenant.id;

  const supabase = await (await import('@/lib/supabase/server')).createClient();

  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error || !payment) {
    redirect('/dashboard/billing');
  }

  const paymentRow = payment as Payment;
  const statusInfo = derivePaymentStatusLabel(paymentRow.status);
  const purposeLabel = derivePaymentPurposeLabel(paymentRow.purpose);

  return (
    <DashboardShell
      profileName={context.profile.name}
      storeName={context.activeTenant.name}
      role={context.role}
      showUpgradeCta={false}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-[-0.07em] text-slate-900 sm:text-4xl">
              Payment details
            </h1>
            <p className="mt-2 text-base text-slate-600">
              Review the status and details of this payment.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/dashboard/billing" className="text-xs font-medium text-violet-700 hover:text-violet-900 underline-offset-4 hover:underline">
              Back to billing
            </a>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Reference
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900 break-all">
                {paymentRow.id}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Type
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {purposeLabel}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Amount
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {formatBDT(paymentRow.amount)} {paymentRow.currency}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted p-4 flex items-end">
              <StatusBadge variant={statusInfo.variant}>
                {statusInfo.label}
              </StatusBadge>
            </div>

            <div className="col-span-2 rounded-xl border border-border bg-muted p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Status detail
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {statusInfo.description}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Provider
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {paymentRow.provider.charAt(0).toUpperCase() + paymentRow.provider.slice(1)}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Created
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {formatDateTimeISO(paymentRow.created_at) ?? '—'}
              </p>
            </div>

            {paymentRow.verified_at && (
              <div className="rounded-xl border border-border bg-muted p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Verified
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {formatDateTimeISO(paymentRow.verified_at)}
                </p>
              </div>
            )}

            {paymentRow.target_plan_id && (
              <div className="rounded-xl border border-border bg-muted p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Target plan
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {paymentRow.target_plan_id}
                </p>
              </div>
            )}

            {paymentRow.renewal_period_start && paymentRow.renewal_period_end && (
              <div className="col-span-2 rounded-xl border border-border bg-muted p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Renewal period
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {formatDateISO(paymentRow.renewal_period_start)} —{' '}
                  {formatDateISO(paymentRow.renewal_period_end)}
                </p>
              </div>
            )}

            {paymentRow.failure_reason && (
              <div className="col-span-2 rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-700">
                  Failure reason
                </p>
                <p className="mt-1 text-sm text-red-900">
                  {paymentRow.failure_reason}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button asChild>
            <a href="/dashboard/billing">Back to billing</a>
          </Button>
        </div>
      </div>
    </DashboardShell>
  );
}
