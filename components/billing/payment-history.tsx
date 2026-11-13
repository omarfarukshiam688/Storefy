'use client';

import * as React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { formatBDT, formatDateISO } from '@/lib/billing/format-currency';
import { derivePaymentStatusLabel, derivePaymentPurposeLabel } from '@/lib/billing/subscription-state';
import type { Payment } from '@/types';

interface PaymentListResponse {
  payments: Payment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function PaymentHistory() {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);

  const pageSize = 10;

  const fetchPayments = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        status: 'all',
        purpose: 'all',
      });
      const res = await fetch(`/api/subscriptions/payments?${params}`);
      if (!res.ok) throw new Error('Failed to load payments');
      const data: PaymentListResponse = await res.json();
      setPayments(data.payments);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [page]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPayments();
  }, [fetchPayments]);

  const totalPages = Math.ceil(total / pageSize);

  if (loading) {
    return (
      <Card className="border-violet-100 bg-white/80">
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-100 bg-red-50/40">
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <p className="text-sm text-red-900">{error}</p>
          <Button variant="outline" onClick={fetchPayments} className="mt-4">
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (payments.length === 0) {
    return (
      <Card className="border-violet-100 bg-white/80">
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <p className="text-sm text-slate-600">No payments recorded yet.</p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between sm:flex-col sm:gap-2 pb-4">
        <div>
          <CardTitle>Payment history</CardTitle>
          <p className="text-sm text-slate-600">
            {total} payment record(s) for your store
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/dashboard/billing"
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-violet-600 text-white hover:bg-violet-700"
          >
            Back to billing
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 font-semibold text-slate-600">Reference</th>
                <th className="pb-3 font-semibold text-slate-600">Type</th>
                <th className="pb-3 font-semibold text-slate-600 text-right">Amount</th>
                <th className="pb-3 font-semibold text-slate-600">Status</th>
                <th className="pb-3 font-semibold text-slate-600">Created</th>
                <th className="pb-3 font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const statusInfo = derivePaymentStatusLabel(payment.status);
                const purposeLabel = derivePaymentPurposeLabel(payment.purpose);
                return (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    statusInfo={statusInfo}
                    purposeLabel={purposeLabel}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="pt-4 pb-2 border-t border-border">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-slate-600">
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

interface PaymentRowProps {
  payment: Payment;
  statusInfo: ReturnType<typeof derivePaymentStatusLabel>;
  purposeLabel: string;
}

function PaymentRow({ payment, statusInfo, purposeLabel }: PaymentRowProps) {
  return (
    <tr className="border-b border-border hover:bg-muted/50 transition-colors">
      <td className="py-4 text-sm font-medium text-slate-900 truncate max-w-xs">
        {payment.id}
      </td>
      <td className="py-4 text-sm text-slate-600">{purposeLabel}</td>
      <td className="py-4 text-sm font-medium text-slate-900 text-right">
        {formatBDT(payment.amount)} {payment.currency}
      </td>
      <td className="py-4">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            statusInfo.variant === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : statusInfo.variant === 'warning'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : statusInfo.variant === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : statusInfo.variant === 'info'
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-muted text-muted-foreground border-border'
          }`}
        >
          {statusInfo.label}
        </span>
      </td>
      <td className="py-4 text-sm text-slate-600">
        {formatDateISO(payment.created_at) ?? '—'}
      </td>
      <td className="py-4">
        <a
          href={`/dashboard/billing/payment/${payment.id}`}
          className="text-xs font-medium text-violet-700 hover:text-violet-900 underline-offset-4 hover:underline"
        >
          View details
        </a>
      </td>
    </tr>
  );
}
