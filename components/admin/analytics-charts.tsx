'use client';

import * as React from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DailyMetric, StatusDistribution, ProductPerformance } from '@/lib/analytics';
import { format } from 'date-fns';

const CHART_COLORS = {
  violet: '#8b5cf6',
  violetLight: '#a78bfa',
  indigo: '#6366f1',
  indigoLight: '#818cf8',
  blue: '#3b82f6',
  blueLight: '#60a5fa',
  emerald: '#10b981',
  emeraldLight: '#6ee7b7',
  amber: '#f59e0b',
  amberLight: '#fcd34d',
  rose: '#f43f5e',
  sky: '#0ea5e9',
  skyLight: '#7dd3fc',
  slate: '#64748b',
};

const STATUS_COLORS: Record<string, string> = {
  pending: CHART_COLORS.amber,
  confirmed: CHART_COLORS.blue,
  processing: CHART_COLORS.violet,
  shipped: CHART_COLORS.indigo,
  delivered: CHART_COLORS.emerald,
  cancelled: CHART_COLORS.rose,
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatShortDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return format(date, 'MMM d');
  } catch {
    return dateStr;
  }
}

function formatFullDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return format(date, 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

// Shared X-axis configuration for consistent date label behavior across all trend charts
const sharedXAxisConfig = {
  dataKey: 'date',
  tick: { fontSize: 11, fill: '#94a3b8' },
  tickLine: false,
  axisLine: { stroke: '#e2e8f0' },
  tickFormatter: formatShortDate,
  minTickGap: 40,
} as const;

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
  currency?: boolean;
}

function ChartTooltip({ active, payload, label, currency }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-violet-100 bg-white/95 px-4 py-3 shadow-lg shadow-violet-200/30 backdrop-blur-sm">
      <p className="text-xs font-semibold text-slate-500 mb-1.5">{formatFullDate(label ?? '')}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-slate-600 capitalize">{entry.name}</span>
          <span className="text-sm font-semibold text-slate-900 ml-auto">
            {entry.dataKey === 'revenue' || currency ? formatCurrency(entry.value) : entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

interface ChartSkeletonProps {
  height?: number;
}

const SKELETON_BAR_HEIGHTS = [55, 35, 70, 45, 80, 40, 65, 50, 75, 38, 60, 48];

export function ChartSkeleton({ height = 280 }: ChartSkeletonProps) {
  return (
    <div className="flex items-end gap-2 h-full min-h-[200px] pt-4" style={{ height: `${height}px` }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 animate-pulse rounded-t-md bg-violet-100/60"
          style={{ height: `${SKELETON_BAR_HEIGHTS[i]}%` }}
        />
      ))}
    </div>
  );
}

interface EmptyChartProps {
  title: string;
  description: string;
}

export function EmptyChart({ title, description }: EmptyChartProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-300 mb-3">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="text-xs text-slate-400 mt-1 max-w-[200px]">{description}</p>
    </div>
  );
}

interface RevenueTrendChartProps {
  data: DailyMetric[];
  isLoading?: boolean;
}

export function RevenueTrendChart({ data, isLoading }: RevenueTrendChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-[24px] border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Revenue</p>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Revenue Trend</h3>
        </div>
        <div className="h-[280px]">
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  const hasData = data.some((d) => d.revenue > 0);

  return (
    <div className="rounded-[24px] border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Revenue</p>
        <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Revenue Trend</h3>
      </div>
      {hasData ? (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.indigo} stopOpacity={0.35} />
                  <stop offset="50%" stopColor={CHART_COLORS.violet} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={CHART_COLORS.violet} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="revenueLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={CHART_COLORS.blue} />
                  <stop offset="100%" stopColor={CHART_COLORS.violet} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis {...sharedXAxisConfig} />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                width={45}
              />
              <Tooltip content={<ChartTooltip currency />} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="url(#revenueLineGradient)"
                strokeWidth={2.5}
                fill="url(#revenueAreaGradient)"
                dot={false}
                activeDot={{ r: 5, fill: CHART_COLORS.violet, strokeWidth: 2, stroke: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[280px]">
          <EmptyChart
            title="No revenue data yet"
            description="Revenue trends will appear once your store starts receiving paid orders."
          />
        </div>
      )}
    </div>
  );
}

interface OrderTrendChartProps {
  data: DailyMetric[];
  isLoading?: boolean;
}

export function OrderTrendChart({ data, isLoading }: OrderTrendChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-[24px] border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Orders</p>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Order Trend</h3>
        </div>
        <div className="h-[280px]">
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  const hasData = data.some((d) => d.orders > 0);

  return (
    <div className="rounded-[24px] border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Orders</p>
        <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Order Trend</h3>
      </div>
      {hasData ? (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="orderBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.indigo} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={CHART_COLORS.violet} stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis {...sharedXAxisConfig} />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                allowDecimals={false}
                width={35}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.06)' }} />
              <Bar dataKey="orders" name="Orders" fill="url(#orderBarGradient)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[280px]">
          <EmptyChart
            title="No order data yet"
            description="Order trends will appear once customers start placing orders."
          />
        </div>
      )}
    </div>
  );
}

interface StatusDistributionChartProps {
  data: StatusDistribution[];
  isLoading?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function StatusDistributionCustomTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
  total: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  const totalNum = total as number;
  const pct = totalNum > 0 ? ((Number(entry.value) / totalNum) * 100).toFixed(1) : '0';
  return (
    <div className="rounded-xl border border-violet-100 bg-white/95 px-4 py-3 shadow-lg shadow-violet-200/30 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.payload.fill }} />
        <span className="text-xs font-medium text-slate-600">{STATUS_LABELS[entry.name] ?? entry.name}</span>
      </div>
      <p className="text-lg font-bold text-slate-900 mt-0.5">{entry.value}</p>
      <p className="text-xs text-slate-400">{pct}% of orders</p>
    </div>
  );
}

export function StatusDistributionChart({ data, isLoading }: StatusDistributionChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-[24px] border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Distribution</p>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Order Status</h3>
        </div>
        <div className="h-[280px] flex items-center justify-center">
          <ChartSkeleton height={200} />
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="rounded-[24px] border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Distribution</p>
        <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Order Status</h3>
      </div>
      {data.length > 0 ? (
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="h-[220px] w-full md:w-[220px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="status"
                  label={false}
                  stroke="none"
                >
                  {data.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#cbd5e1'} />
                  ))}
                </Pie>
                <Tooltip content={<StatusDistributionCustomTooltip total={total} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 w-full space-y-2">
            {data.map((entry) => (
              <div
                key={entry.status}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[entry.status] ?? '#cbd5e1' }}
                  />
                  <span className="text-sm font-medium text-slate-700">{STATUS_LABELS[entry.status] ?? entry.status}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{entry.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-[220px]">
          <EmptyChart
            title="No orders yet"
            description="Order status distribution will appear once you receive orders."
          />
        </div>
      )}
    </div>
  );
}

interface CompletedVsCancelledChartProps {
  completed: number;
  cancelled: number;
  isLoading?: boolean;
}

export function CompletedVsCancelledChart({ completed, cancelled, isLoading }: CompletedVsCancelledChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-[24px] border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Comparison</p>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Completed vs Cancelled</h3>
        </div>
        <div className="h-[220px]">
          <ChartSkeleton height={150} />
        </div>
      </div>
    );
  }

  const data = [
    { name: 'Completed', value: completed, color: CHART_COLORS.emerald },
    { name: 'Cancelled', value: cancelled, color: CHART_COLORS.slate },
  ].filter((d) => d.value > 0);

  const total = completed + cancelled;

  return (
    <div className="rounded-[24px] border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Comparison</p>
        <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Completed vs Cancelled</h3>
      </div>
      {total > 0 ? (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="completedBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.emerald} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={CHART_COLORS.emeraldLight} stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="cancelledBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.slate} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={CHART_COLORS.slate} stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} allowDecimals={false} width={35} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const entry = payload[0];
                  const totalNum = total as number;
                  const pct = totalNum > 0 ? ((Number(entry.value) / totalNum) * 100).toFixed(1) : '0';
                  return (
                    <div className="rounded-xl border border-violet-100 bg-white/95 px-4 py-3 shadow-lg shadow-violet-200/30 backdrop-blur-sm">
                      <p className="text-sm font-semibold text-slate-900">{(entry.value ?? 0).toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{pct}% of total</p>
                    </div>
                  );
                }}
                cursor={{ fill: 'rgba(139, 92, 246, 0.06)' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={`url(#${entry.name === 'Completed' ? 'completed' : 'cancelled'}BarGradient)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[220px]">
          <EmptyChart
            title="No completed orders yet"
            description="Completion and cancellation data will appear here as orders are processed."
          />
        </div>
      )}
    </div>
  );
}

interface TopProductsTableProps {
  products: ProductPerformance[];
  isLoading?: boolean;
}

export function TopProductsTable({ products, isLoading }: TopProductsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-[24px] border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Performance</p>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Best-Selling Products</h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-violet-100/40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Performance</p>
        <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Best-Selling Products</h3>
      </div>
      {products.length > 0 ? (
        <>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-violet-100">
                  <th className="h-10 px-4 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Product
                  </th>
                  <th className="h-10 px-4 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Orders
                  </th>
                  <th className="h-10 px-4 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, idx) => (
                  <tr key={product.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-xs font-bold text-violet-700">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-slate-900 truncate max-w-[200px]">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-slate-900">{product.orders.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCurrency(product.revenue)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sm:hidden space-y-3">
            {products.map((product, idx) => (
              <div
                key={product.id}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-xs font-bold text-violet-700 flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-slate-900 text-sm truncate">{product.name}</span>
                </div>
                <div className="flex items-center justify-between mt-3 ml-10">
                  <span className="text-xs text-slate-500">{product.orders} orders</span>
                  <span className="text-sm font-semibold text-slate-900">{formatCurrency(product.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm font-medium text-slate-900">No product data yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Product performance will appear once orders are placed.
          </p>
        </div>
      )}
    </div>
  );
}
