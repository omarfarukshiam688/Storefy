import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/auth/session';
import { getTenantContext } from '@/lib/auth/tenant';
import {
  getAnalyticsOverview,
  getRevenueTrend,
  getOrderTrend,
  getOrderStatusDistribution,
  getTopProducts,
  getCustomerInsights,
  getRevenueGrowth,
  getOrderGrowth,
  type DateRangePreset,
  type GrowthIndicator,
} from '@/lib/analytics';
import { AnalyticsClient } from './analytics-client';

interface AnalyticsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  await requireAuthUser();

  const context = await getTenantContext();

  if (!context.activeTenant) {
    redirect('/dashboard/onboarding');
  }

  const tenant = context.activeTenant;
  const resolvedParams = await searchParams;

  const preset = (typeof resolvedParams.preset === 'string'
    ? resolvedParams.preset
    : '30days') as DateRangePreset;

  const customStart = typeof resolvedParams.start === 'string' ? resolvedParams.start : undefined;
  const customEnd = typeof resolvedParams.end === 'string' ? resolvedParams.end : undefined;

  let error: string | null = null;
  let overview = null;
  let revenueTrend: Awaited<ReturnType<typeof getRevenueTrend>> = [];
  let orderTrend: Awaited<ReturnType<typeof getOrderTrend>> = [];
  let statusDistribution: Awaited<ReturnType<typeof getOrderStatusDistribution>> = [];
  let topProducts: Awaited<ReturnType<typeof getTopProducts>> = [];
  let customerInsights: Awaited<ReturnType<typeof getCustomerInsights>> | null = null;
  let revenueGrowth: GrowthIndicator | null = null;
  let orderGrowth: GrowthIndicator | null = null;

  try {
    const results = await Promise.all([
      getAnalyticsOverview(tenant.id, preset, customStart, customEnd),
      getRevenueTrend(tenant.id, preset, customStart, customEnd),
      getOrderTrend(tenant.id, preset, customStart, customEnd),
      getOrderStatusDistribution(tenant.id, preset, customStart, customEnd),
      getTopProducts(tenant.id, preset, customStart, customEnd, 5),
      getCustomerInsights(tenant.id, preset, customStart, customEnd),
      getRevenueGrowth(tenant.id),
      getOrderGrowth(tenant.id),
    ]);

    overview = results[0];
    revenueTrend = results[1];
    orderTrend = results[2];
    statusDistribution = results[3];
    topProducts = results[4];
    customerInsights = results[5];
    revenueGrowth = results[6];
    orderGrowth = results[7];
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load analytics data.';
  }

  const formatRangeLabel = (): string => {
    switch (preset) {
      case 'today':
        return 'Today';
      case '7days':
        return 'Last 7 days';
      case '30days':
        return 'Last 30 days';
      case 'custom':
        if (customStart && customEnd) {
          const start = new Date(customStart + 'T00:00:00');
          const end = new Date(customEnd + 'T00:00:00');
          const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return `${fmt(start)} – ${fmt(end)}`;
        }
        return 'Custom range';
    }
  };

  return (
    <AnalyticsClient
      overview={overview}
      revenueTrend={revenueTrend}
      orderTrend={orderTrend}
      statusDistribution={statusDistribution}
      topProducts={topProducts}
      customerInsights={customerInsights}
      revenueGrowth={revenueGrowth}
      orderGrowth={orderGrowth}
      isLoading={false}
      error={error}
      preset={preset}
      customStart={customStart}
      customEnd={customEnd}
      rangeLabel={formatRangeLabel()}
    />
  );
}

export const metadata = {
  title: 'Analytics | Storefy',
};
