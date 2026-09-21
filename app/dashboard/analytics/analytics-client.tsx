'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DollarSign, ShoppingCart, TrendingUp, Users, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  RevenueTrendChart,
  OrderTrendChart,
  StatusDistributionChart,
  CompletedVsCancelledChart,
  TopProductsTable,
} from '@/components/admin/analytics-charts';
import type { DateRangePreset, StatusDistribution, GrowthIndicator } from '@/lib/analytics';
import { cn } from '@/lib/utils';

interface AnalyticsClientProps {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    totalCustomers: number;
    completedOrders: number;
    cancelledOrders: number;
  } | null;
  revenueTrend: { date: string; revenue: number; orders: number }[];
  orderTrend: { date: string; revenue: number; orders: number }[];
  statusDistribution: StatusDistribution[];
  topProducts: { id: string; name: string; orders: number; revenue: number }[];
  customerInsights: { newCustomers: number; repeatCustomers: number; totalCustomers: number } | null;
  revenueGrowth: GrowthIndicator | null;
  orderGrowth: GrowthIndicator | null;
  isLoading: boolean;
  error: string | null;
  preset: DateRangePreset;
  customStart?: string;
  customEnd?: string;
  rangeLabel: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function GrowthBadge({ growth }: { growth: GrowthIndicator | null }) {
  if (!growth || growth.percentage === null) {
    return (
      <p className="mt-1 text-[11px] text-slate-400">No previous data</p>
    );
  }

  const isPositive = growth.percentage >= 0;
  const arrow = isPositive ? '↑' : '↓';
  const colorClass = isPositive ? 'text-emerald-700' : 'text-red-600';
  const bgClass = isPositive ? 'bg-emerald-50' : 'bg-red-50';

  return (
    <div className={cn('mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', bgClass, colorClass)}>
      <span>{arrow}</span>
      <span>{Math.abs(growth.percentage).toFixed(1)}%</span>
      <span className="text-slate-400 font-normal">vs previous month</span>
    </div>
  );
}

function AnalyticsErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[24px] border border-red-100 bg-red-50/50 p-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-4">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-red-900">Unable to load analytics</p>
      <p className="text-xs text-red-600 mt-1 max-w-sm">{message}</p>
      <Button onClick={onRetry} variant="outline" size="sm" className="mt-4">
        Try again
      </Button>
    </div>
  );
}

function AnalyticsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-violet-200 bg-violet-50/30 p-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-400 mb-4">
        <TrendingUp className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-slate-900">No analytics data yet</p>
      <p className="text-xs text-slate-400 mt-1 max-w-sm">
        Once your store starts receiving orders, your analytics dashboard will show revenue trends, order insights, and product performance here.
      </p>
    </div>
  );
}

function DateRangeControls({
  preset,
  customStart,
  customEnd,
  onPresetChange,
  onCustomStartChange,
  onCustomEndChange,
  rangeLabel,
}: {
  preset: DateRangePreset;
  customStart?: string;
  customEnd?: string;
  onPresetChange: (p: DateRangePreset) => void;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
  rangeLabel: string;
}) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-slate-500 mr-1">{rangeLabel}</span>
      <div className="flex items-center gap-1.5">
        {(['today', '7days', '30days', 'custom'] as const).map((p) => (
          <Button
            key={p}
            variant={preset === p ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPresetChange(p)}
            className="h-8 text-xs font-medium"
          >
            {p === 'today' && 'Today'}
            {p === '7days' && '7 Days'}
            {p === '30days' && '30 Days'}
            {p === 'custom' && 'Custom'}
          </Button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <input
            type="date"
            value={customStart ?? ''}
            max={today}
            onChange={(e) => onCustomStartChange(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={customEnd ?? ''}
            max={today}
            onChange={(e) => onCustomEndChange(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}
    </div>
  );
}

export function AnalyticsClient({
  overview,
  revenueTrend,
  orderTrend,
  statusDistribution,
  topProducts,
  customerInsights,
  revenueGrowth,
  orderGrowth,
  isLoading,
  error,
  preset,
  customStart,
  customEnd,
  rangeLabel,
}: AnalyticsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.push(`/dashboard/analytics?${params.toString()}`);
  };

  const handlePresetChange = (p: DateRangePreset) => {
    const updates: Record<string, string | undefined> = { preset: p };
    if (p !== 'custom') {
      updates.start = undefined;
      updates.end = undefined;
    }
    updateParams(updates);
  };

  const handleCustomStartChange = (v: string) => {
    updateParams({ start: v || undefined });
  };

  const handleCustomEndChange = (v: string) => {
    updateParams({ end: v || undefined });
  };

  const handleRetry = () => {
    router.refresh();
  };

  const hasAnyData = overview !== null && (overview.totalRevenue > 0 || overview.totalOrders > 0);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-violet-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(255,255,255,0.55)_32%,_rgba(218,233,255,0.45)_70%,_rgba(224,215,255,0.35)_100%)] p-5 shadow-[0_30px_80px_-40px_rgba(79,70,229,0.45)] sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-700">
              <TrendingUp className="h-3.5 w-3.5" />
              Analytics
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.07em] text-slate-900 sm:text-4xl">
              Performance overview
            </h1>
            <p className="mt-2 max-w-xl text-base leading-7 text-slate-600">
              Understand your store&apos;s revenue, orders, and customer activity.
            </p>
          </div>
          <div className="flex-shrink-0">
            <DateRangeControls
              preset={preset}
              customStart={customStart}
              customEnd={customEnd}
              onPresetChange={handlePresetChange}
              onCustomStartChange={handleCustomStartChange}
              onCustomEndChange={handleCustomEndChange}
              rangeLabel={rangeLabel}
            />
          </div>
        </div>
      </section>

      {error && !isLoading && (
        <AnalyticsErrorState message={error} onRetry={handleRetry} />
      )}

      {!error && !hasAnyData && !isLoading && (
        <AnalyticsEmptyState />
      )}

      {!error && hasAnyData && overview && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col justify-between rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Revenue</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  {formatCurrency(overview.totalRevenue)}
                </p>
                <GrowthBadge growth={revenueGrowth} />
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <ShoppingCart className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Orders</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  {formatNumber(overview.totalOrders)}
                </p>
                <GrowthBadge growth={orderGrowth} />
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Avg. Order Value</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  {formatCurrency(overview.averageOrderValue)}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Customers</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  {formatNumber(overview.totalCustomers)}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">All time</p>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <RevenueTrendChart data={revenueTrend} isLoading={isLoading} />
            <OrderTrendChart data={orderTrend} isLoading={isLoading} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <StatusDistributionChart data={statusDistribution} isLoading={isLoading} />
            <CompletedVsCancelledChart
              completed={overview.completedOrders}
              cancelled={overview.cancelledOrders}
              isLoading={isLoading}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <TopProductsTable products={topProducts} isLoading={isLoading} />
            <div className="rounded-[24px] border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Insights</p>
                <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Customer Insights</h3>
              </div>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-xl bg-violet-100/40" />
                  ))}
                </div>
              ) : customerInsights ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <Users className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-600">New customers</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900">{customerInsights.newCustomers.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-600">Repeat customers</span>
                        <p className="text-[11px] text-slate-400">2+ paid orders in selected period</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-slate-900">{customerInsights.repeatCustomers.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                        <Package className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-600">Total customers</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900">{customerInsights.totalCustomers.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium text-slate-900">No customer data yet</p>
                  <p className="text-xs text-slate-400 mt-1">Customer insights will appear once customers place orders.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-violet-200/80 bg-white/80 p-5 sm:p-6">
        <div className="h-8 w-32 animate-pulse rounded-full bg-violet-100" />
        <div className="mt-4 h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-2 h-5 w-80 animate-pulse rounded bg-slate-100" />
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl border border-violet-100 bg-white/60" />
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="h-[360px] animate-pulse rounded-[24px] border border-violet-100 bg-white/60" />
        <div className="h-[360px] animate-pulse rounded-[24px] border border-violet-100 bg-white/60" />
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="h-[360px] animate-pulse rounded-[24px] border border-violet-100 bg-white/60" />
        <div className="h-[360px] animate-pulse rounded-[24px] border border-violet-100 bg-white/60" />
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="h-[300px] animate-pulse rounded-[24px] border border-violet-100 bg-white/60" />
        <div className="h-[300px] animate-pulse rounded-[24px] border border-violet-100 bg-white/60" />
      </section>
    </div>
  );
}
