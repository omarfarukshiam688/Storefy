'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from 'sonner';
import {
  RefreshCw,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Clock,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import type { Payment } from '@/types';
import { humanize, isGatewayPayment } from '@/lib/payments/verification';

interface PaymentWithRelations extends Payment {
  tenant: {
    name: string | null;
    slug: string | null;
  } | null;
  target_plan: {
    name: string | null;
    price_monthly: number | null;
    is_active: boolean | null;
  } | null;
}

interface PaymentMetricCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  variant: 'default' | 'warning' | 'success' | 'error';
}

function PaymentMetricCard({
  title,
  value,
  icon: Icon,
  variant,
}: PaymentMetricCardProps) {
  const iconColors: Record<string, string> = {
    default: 'text-slate-600 border-slate-200 bg-slate-100',
    warning: 'text-amber-600 border-amber-200 bg-amber-100',
    success: 'text-emerald-600 border-emerald-200 bg-emerald-100',
    error: 'text-red-600 border-red-200 bg-red-100',
  };

  return (
    <Card className="border border-border/60 bg-white px-4 py-3 shadow-sm md:min-h-[96px] md:px-5 md:py-4">
      <div className="flex h-full items-center gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconColors[variant]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="mb-0.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {title}
          </p>
          <p className="text-2xl font-bold leading-none tracking-tight text-slate-900">
            {value.toLocaleString()}
          </p>
        </div>
      </div>
    </Card>
  );
}

interface PaymentStatusBadgeProps {
  status: string;
}

const paymentStatusVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'brand' | 'neutral'> = {
  verification_required: 'warning',
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  succeeded: 'success',
  failed: 'error',
  rejected: 'error',
  refunded: 'neutral',
};

function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const variant = paymentStatusVariant[status] ?? 'neutral';
  return <StatusBadge variant={variant}>{humanize(status)}</StatusBadge>;
}

function exceptionReasons(payment: PaymentWithRelations): string[] {
  const metadata =
    payment.metadata !== null && typeof payment.metadata === 'object'
      ? (payment.metadata as Record<string, unknown>)
      : {};
  const reasons: string[] = [];

  const gatewayAmount =
    typeof metadata.gateway_amount === 'number'
      ? metadata.gateway_amount
      : typeof metadata.gateway_amount === 'string' && Number.isFinite(Number(metadata.gateway_amount))
        ? Number(metadata.gateway_amount)
        : null;

  if (payment.status === 'completed' && reasons.length === 0) {
    // Only completed payments can be exceptions; other statuses are handled separately.
    if (
      gatewayAmount !== null &&
      payment.expected_amount !== null &&
      Math.abs(gatewayAmount - payment.expected_amount) >= 0.01
    ) {
      reasons.push('Amount mismatch');
    }

    const duplicate = metadata.duplicate_check;
    if (typeof duplicate === 'string' && duplicate !== 'none' && duplicate !== 'no_duplicate') {
      reasons.push('Duplicate transaction');
    }

    const verificationSource = metadata.verification_source;
    if (
      (isGatewayPayment(payment.provider) || typeof metadata.gateway_status === 'string') &&
      verificationSource !== 'server_callback' &&
      verificationSource !== 'server_verified'
    ) {
      reasons.push('Gateway confirmation not authenticated');
    }
  }

  return reasons;
}

interface PaymentRowState {
  label: string;
  description: string;
  className: string;
  icon: React.ElementType;
}

function rowState(payment: PaymentWithRelations): PaymentRowState {
  const reasons = exceptionReasons(payment);

  if (payment.status === 'verification_required' || payment.status === 'pending' || payment.status === 'processing') {
    return {
      label: 'Awaiting Verification',
      description: 'Automated verification has not produced a final outcome yet.',
      className: 'border-sky-200 bg-sky-50 text-sky-700',
      icon: Clock,
    };
  }

  if (payment.status === 'failed') {
    return {
      label: 'Failed',
      description: 'The gateway did not complete this payment.',
      className: 'border-red-200 bg-red-50 text-red-700',
      icon: XCircle,
    };
  }

  if (payment.status === 'refunded') {
    return {
      label: 'Refunded',
      description: 'This payment was refunded.',
      className: 'border-slate-200 bg-slate-50 text-slate-600',
      icon: AlertCircle,
    };
  }

  if (reasons.length > 0) {
    return {
      label: 'Exception',
      description: reasons.join(' · '),
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      icon: AlertTriangle,
    };
  }

  return {
    label: 'Auto-Verified',
    description: 'All automated verification checks passed.',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: ShieldCheck,
  };
}

interface PaymentPurposeBadgeProps {
  purpose: string;
}

function PaymentPurposeBadge({ purpose }: PaymentPurposeBadgeProps) {
  const displayName = purpose.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 shadow-sm">
      {displayName}
    </span>
  );
}

interface PaymentsListClientProps {
  initialStatus: string;
  initialPurpose: string;
  initialSearch: string;
  initialPage: number;
  initialPageSize: number;
}

export default function PaymentsListClient({
  initialStatus,
  initialPurpose,
  initialSearch,
  initialPage,
  initialPageSize,
}: PaymentsListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [payments, setPayments] = React.useState<PaymentWithRelations[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(initialPage);
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [totalPages, setTotalPages] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState(initialStatus);
  const [purposeFilter, setPurposeFilter] = React.useState(initialPurpose);
  const [searchQuery, setSearchQuery] = React.useState(initialSearch);
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [metrics, setMetrics] = React.useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    refunded: 0,
    total: 0,
    exceptions: 0,
  });

  const fetchPayments = React.useCallback(async () => {
    setLoading(true);
    try {
      const isExceptionView = statusFilter === 'exceptions';
      const params = new URLSearchParams();
      if (!isExceptionView) {
        params.set('status', statusFilter);
      }
      params.set('purpose', purposeFilter);
      if (searchQuery) params.set('search', searchQuery);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const response = await fetch(`/api/platform/payments?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }
      const data = await response.json();
      const rows: PaymentWithRelations[] = data.payments || [];
      const filtered = isExceptionView ? rows.filter((row) => exceptionReasons(row).length > 0) : rows;

      setPayments(filtered);
      setTotal(isExceptionView ? filtered.length : data.total || 0);
      setPage(data.page || page);
      setPageSize(data.pageSize || pageSize);
      setTotalPages(isExceptionView ? 1 : data.totalPages || 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, purposeFilter, searchQuery, page, pageSize]);

  const fetchMetrics = React.useCallback(async () => {
    try {
      const [pendingRes, verifiedRes, failedRes, refundedRes, totalRes] = await Promise.all([
        fetch('/api/platform/payments?status=verification_required&pageSize=1'),
        fetch('/api/platform/payments?status=completed&pageSize=1'),
        fetch('/api/platform/payments?status=failed&pageSize=1'),
        fetch('/api/platform/payments?status=refunded&pageSize=1'),
        fetch('/api/platform/payments?pageSize=1'),
      ]);

      const [pendingData, verifiedData, failedData, refundedData, totalData] = await Promise.all([
        pendingRes.json(),
        verifiedRes.json(),
        failedRes.json(),
        refundedRes.json(),
        totalRes.json(),
      ]);

      setMetrics((current) => ({
        ...current,
        pending: pendingData.total || 0,
        approved: verifiedData.total || 0,
        rejected: failedData.total || 0,
        refunded: refundedData.total || 0,
        total: totalData.total || 0,
      }));
    } catch {
      // Metrics are non-critical
    }
  }, []);

  const fetchExceptionCount = React.useCallback(async () => {
    try {
      const response = await fetch('/api/platform/payments?status=completed&pageSize=100');
      if (!response.ok) return;
      const data = await response.json();
      const rows: PaymentWithRelations[] = data.payments || [];
      setMetrics((current) => ({
        ...current,
        exceptions: rows.filter((row) => exceptionReasons(row).length > 0).length,
      }));
    } catch {
      // Exception counts are advisory only.
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function init() {
      if (cancelled) return;
      await fetchPayments();
      await fetchMetrics();
      await fetchExceptionCount();
    }
    init();
    return () => { cancelled = true; };
  }, [fetchPayments, fetchMetrics, fetchExceptionCount]);

  const handleRefresh = () => {
    setRefreshing(true);
    Promise.allSettled([fetchPayments(), fetchMetrics(), fetchExceptionCount()]).finally(() => {
      setRefreshing(false);
    });
    toast.success('Payments refreshed');
  };

  const updateQueryParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    updateQueryParams({ status: value === 'all' ? '' : value });
  };

  const handlePurposeChange = (value: string) => {
    setPurposeFilter(value);
    updateQueryParams({ purpose: value === 'all' ? '' : value });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateQueryParams({ search: searchQuery });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateQueryParams({ page: String(newPage) });
  };

  const shortId = (id: string) => `${id.slice(0, 8)}...`;

  const statusTabs = [
    { key: 'all', label: 'All Payments', count: metrics.total },
    { key: 'exceptions', label: 'Exceptions', count: metrics.exceptions },
    { key: 'verification_required', label: 'Awaiting Verification', count: metrics.pending },
    { key: 'completed', label: 'Verified', count: metrics.approved },
    { key: 'failed', label: 'Failed', count: metrics.rejected },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-sm text-slate-500">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[31px] lg:text-4xl">
            Payment Verification
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-slate-500">
            Gateway-confirmed payments are verified automatically. Super Admin reviews exceptions,
            unmatched amounts, and unresolved payments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3"
          >
            {refreshing && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </section>

      {/* Summary Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PaymentMetricCard
          title="Exceptions"
          value={metrics.exceptions}
          icon={AlertTriangle}
          variant="warning"
        />
        <PaymentMetricCard
          title="Awaiting Verification"
          value={metrics.pending}
          icon={Clock}
          variant="warning"
        />
        <PaymentMetricCard
          title="Auto-Verified"
          value={metrics.approved}
          icon={CheckCircle2}
          variant="success"
        />
        <PaymentMetricCard
          title="Failed"
          value={metrics.rejected}
          icon={XCircle}
          variant="error"
        />
      </div>

      {/* Payment Management Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Payment Management
            </p>
            <h2 className="mt-1 text-[19px] font-semibold leading-snug text-slate-900 sm:text-xl lg:text-[22px]">
              Payments requiring attention
            </h2>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-white p-1 shadow-sm">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.key || (tab.key === 'all' && statusFilter === 'all');
            return (
              <Button
                key={tab.key}
                onClick={() => handleStatusChange(tab.key)}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-bold ${
                    isActive ? 'text-white' : 'text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        {/* Search & Filters */}
        <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2 lg:grid-cols-4">
          <form onSubmit={handleSearchSubmit} className="col-span-full lg:col-span-2 relative">
            <Label className="sr-only">Search payments</Label>
            <div className="flex items-center rounded-lg border border-input bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-violet-500 transition-all">
              <Search className="h-4 w-4 text-slate-400" />
              <Input
                id="search-payments"
                placeholder="Search by payment reference or business name..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="flex-1 bg-transparent pl-2 pr-3 text-sm focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button type="submit" size="icon" className="ml-2 h-8 w-8 p-0">
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>
          </form>
          <div className="flex flex-col gap-2 lg:col-span-2">
            <Label htmlFor="payment-type-filter">Payment Type</Label>
            <Select value={purposeFilter} onValueChange={handlePurposeChange}>
              <SelectTrigger id="payment-type-filter" className="h-10 w-full">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="subscription_upgrade">Upgrade</SelectItem>
                <SelectItem value="subscription_renewal">Renewal</SelectItem>
                <SelectItem value="subscription_initial">Initial</SelectItem>
                <SelectItem value="subscription_downgrade">Downgrade</SelectItem>
                <SelectItem value="manual_topup">Top-up</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] table-fixed text-sm">
                <colgroup>
                  <col className="w-[16%]" />
                  <col className="w-[19%]" />
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                  <col className="w-[13%]" />
                  <col className="w-[19%]" />
                  <col className="w-[6%]" />
                  <col className="w-[5%]" />
                </colgroup>
                <thead className="bg-slate-50/50">
                  <tr className="border-b border-border">
                    <th className="h-11 px-4 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Payment
                    </th>
                    <th className="h-11 px-4 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Business
                    </th>
                    <th className="h-11 px-4 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Type
                    </th>
                    <th className="h-11 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Amount
                    </th>
                    <th className="h-11 px-4 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Status
                    </th>
                    <th className="h-11 px-4 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Verification State
                    </th>
                    <th className="h-11 px-4 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Created
                    </th>
                    <th className="h-11 px-4 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <AlertCircle className="h-8 w-8 text-slate-400" />
                          <p className="text-sm font-medium text-slate-900">
                            {searchQuery
                              ? 'No payments found'
                              : statusFilter === 'exceptions'
                                ? 'No exceptions'
                                : 'No payments to review'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {searchQuery
                              ? 'There are no payments matching your current search.'
                              : statusFilter === 'exceptions'
                                ? 'Every gateway payment matched its expected amount and transaction checks.'
                                : 'All subscription payments have been verified.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => {
                        const state = rowState(payment);
                        const StateIcon = state.icon;
                        const reasons = exceptionReasons(payment);
                        return (
                          <tr
                            key={payment.id}
                            className="transition-colors hover:bg-slate-50/50"
                          >
                            <td className="px-4 py-4 align-middle">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                  <CreditCard className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <span className="block truncate font-medium text-slate-900">
                                    {shortId(payment.id)}
                                  </span>
                                  <p className="truncate text-[10px] font-mono text-slate-500">
                                    {payment.idempotency_key.slice(0, 16)}…
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <div className="min-w-0">
                                <span className="block truncate font-medium text-slate-900">
                                  {payment.tenant?.name ?? 'Unknown Tenant'}
                                </span>
                                <p className="truncate text-[10px] font-mono text-slate-500">
                                  /{payment.tenant?.slug ?? '-'}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <PaymentPurposeBadge purpose={payment.purpose} />
                            </td>
                            <td className="px-4 py-4 text-right align-middle whitespace-nowrap">
                              <span className="font-medium text-slate-900">
                                {Number(payment.amount).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                              <span className="ml-1 text-[10px] text-slate-500">
                                {payment.currency}
                              </span>
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <PaymentStatusBadge status={payment.status} />
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <div className="min-w-0">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${state.className}`}
                                  title={state.description}
                                >
                                  <StateIcon className="h-3 w-3" aria-hidden="true" />
                                  {state.label}
                                </span>
                                {reasons.length > 0 && (
                                  <p className="mt-1 truncate text-[10px] text-slate-500">
                                    {reasons.join(' · ')}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 align-middle whitespace-nowrap text-slate-500">
                              {new Date(payment.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-4 text-right align-middle">
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs"
                              >
                                <a href={`/platform/payments/${payment.id}`}>
                                  View <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                </a>
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                </tbody>
              </table>
            </div>
          </CardContent>
          {totalPages > 1 && (
            <CardFooter className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages} &middot; {total} total
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                  className="h-8 px-2.5"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  className="h-8 px-2.5"
                >
                  Next
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </section>
    </div>
  );
}
