import { createClient } from '@/lib/supabase/server';
import type { OrderStatus } from '@/types';

export type DateRangePreset = 'today' | '7days' | '30days' | 'custom';

export interface DateRange {
  startDate: string;
  endDate: string;
  preset: DateRangePreset;
}

export interface AnalyticsOverview {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
  completedOrders: number;
  cancelledOrders: number;
}

export interface GrowthIndicator {
  current: number;
  previous: number;
  percentage: number | null;
}

export interface DailyMetric {
  date: string;
  revenue: number;
  orders: number;
}

export interface StatusDistribution {
  status: OrderStatus;
  count: number;
}

export interface ProductPerformance {
  id: string;
  name: string;
  orders: number;
  revenue: number;
}

export interface CustomerInsights {
  newCustomers: number;
  repeatCustomers: number;
  totalCustomers: number;
}

function getDateRange(preset: DateRangePreset, customStart?: string, customEnd?: string): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today': {
      const start = today.toISOString();
      const end = new Date(today.getTime() + 86400000).toISOString();
      return { startDate: start, endDate: end, preset: 'today' };
    }
    case '7days': {
      const start = new Date(today.getTime() - 6 * 86400000).toISOString();
      const end = new Date(today.getTime() + 86400000).toISOString();
      return { startDate: start, endDate: end, preset: '7days' };
    }
    case '30days': {
      const start = new Date(today.getTime() - 29 * 86400000).toISOString();
      const end = new Date(today.getTime() + 86400000).toISOString();
      return { startDate: start, endDate: end, preset: '30days' };
    }
    case 'custom':
    default: {
      const start = customStart ? new Date(customStart).toISOString() : new Date(today.getTime() - 29 * 86400000).toISOString();
      const end = customEnd ? new Date(new Date(customEnd).getTime() + 86400000).toISOString() : new Date(today.getTime() + 86400000).toISOString();
      return { startDate: start, endDate: end, preset: 'custom' };
    }
  }
}

export function resolveDateRange(preset: DateRangePreset, customStart?: string, customEnd?: string): DateRange {
  return getDateRange(preset, customStart, customEnd);
}

export async function getAnalyticsOverview(tenantId: string, preset: DateRangePreset = '30days', customStart?: string, customEnd?: string): Promise<AnalyticsOverview> {
  const supabase = await createClient();
  const range = getDateRange(preset, customStart, customEnd);

  const [
    paidOrdersResult,
    totalOrdersResult,
    cancelledOrdersResult,
    completedOrdersResult,
    totalCustomersResult,
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('subtotal')
      .eq('tenant_id', tenantId)
      .eq('payment_status', 'paid')
      .gte('created_at', range.startDate)
      .lt('created_at', range.endDate),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', range.startDate)
      .lt('created_at', range.endDate),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('order_status', 'cancelled')
      .gte('created_at', range.startDate)
      .lt('created_at', range.endDate),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('order_status', ['delivered', 'processing', 'shipped'])
      .gte('created_at', range.startDate)
      .lt('created_at', range.endDate),
    supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
  ]);

  const paidOrders = paidOrdersResult.data ?? [];
  const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.subtotal), 0);
  const totalOrders = totalOrdersResult.count ?? 0;
  const averageOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue,
    totalCustomers: totalCustomersResult.count ?? 0,
    completedOrders: completedOrdersResult.count ?? 0,
    cancelledOrders: cancelledOrdersResult.count ?? 0,
  };
}

export async function getRevenueTrend(tenantId: string, preset: DateRangePreset = '30days', customStart?: string, customEnd?: string): Promise<DailyMetric[]> {
  const supabase = await createClient();
  const range = getDateRange(preset, customStart, customEnd);

  const { data, error } = await supabase
    .from('orders')
    .select('subtotal, created_at')
    .eq('tenant_id', tenantId)
    .eq('payment_status', 'paid')
    .gte('created_at', range.startDate)
    .lt('created_at', range.endDate)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch revenue trend: ${error.message}`);
  }

  const dailyMap = new Map<string, number>();
  const orders = data ?? [];

  const startDate = new Date(range.startDate);
  const endDate = new Date(range.endDate);
  const current = new Date(startDate);

  while (current < endDate) {
    const key = current.toISOString().split('T')[0];
    dailyMap.set(key, 0);
    current.setDate(current.getDate() + 1);
  }

  for (const order of orders) {
    const key = order.created_at.split('T')[0];
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + Number(order.subtotal));
  }

  return Array.from(dailyMap.entries())
    .map(([date, revenue]) => ({ date, revenue, orders: 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getOrderTrend(tenantId: string, preset: DateRangePreset = '30days', customStart?: string, customEnd?: string): Promise<DailyMetric[]> {
  const supabase = await createClient();
  const range = getDateRange(preset, customStart, customEnd);

  const { data, error } = await supabase
    .from('orders')
    .select('created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', range.startDate)
    .lt('created_at', range.endDate)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch order trend: ${error.message}`);
  }

  const dailyMap = new Map<string, number>();
  const orders = data ?? [];

  const startDate = new Date(range.startDate);
  const endDate = new Date(range.endDate);
  const current = new Date(startDate);

  while (current < endDate) {
    const key = current.toISOString().split('T')[0];
    dailyMap.set(key, 0);
    current.setDate(current.getDate() + 1);
  }

  for (const order of orders) {
    const key = order.created_at.split('T')[0];
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  }

  return Array.from(dailyMap.entries())
    .map(([date, orders]) => ({ date, revenue: 0, orders }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getOrderStatusDistribution(tenantId: string, preset: DateRangePreset = '30days', customStart?: string, customEnd?: string): Promise<StatusDistribution[]> {
  const supabase = await createClient();
  const range = getDateRange(preset, customStart, customEnd);

  const { data, error } = await supabase
    .from('orders')
    .select('order_status')
    .eq('tenant_id', tenantId)
    .gte('created_at', range.startDate)
    .lt('created_at', range.endDate);

  if (error) {
    throw new Error(`Failed to fetch status distribution: ${error.message}`);
  }

  const counts: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };

  for (const order of data ?? []) {
    const status = order.order_status as OrderStatus;
    counts[status] = (counts[status] || 0) + 1;
  }

  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ status: status as OrderStatus, count }));
}

export async function getTopProducts(tenantId: string, preset: DateRangePreset = '30days', customStart?: string, customEnd?: string, limit = 5): Promise<ProductPerformance[]> {
  const supabase = await createClient();
  const range = getDateRange(preset, customStart, customEnd);

  const { data: items, error } = await supabase
    .from('order_items')
    .select('product_id, product_name_snapshot, item_total, orders!inner(tenant_id, created_at, order_status)')
    .eq('orders.tenant_id', tenantId)
    .neq('orders.order_status', 'cancelled')
    .gte('orders.created_at', range.startDate)
    .lt('orders.created_at', range.endDate)
    .order('item_total', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Failed to fetch top products: ${error.message}`);
  }

  const productMap = new Map<string, { name: string; orders: number; revenue: number }>();

  for (const item of items ?? []) {
    const key = item.product_id ?? 'unknown';
    const existing = productMap.get(key);
    if (existing) {
      existing.orders += 1;
      existing.revenue += Number(item.item_total);
    } else {
      productMap.set(key, {
        name: item.product_name_snapshot,
        orders: 1,
        revenue: Number(item.item_total),
      });
    }
  }

  return Array.from(productMap.entries())
    .map(([id, data]) => ({ id, name: data.name, orders: data.orders, revenue: data.revenue }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, limit);
}

export async function getCustomerInsights(tenantId: string, preset: DateRangePreset = '30days', customStart?: string, customEnd?: string): Promise<CustomerInsights> {
  const supabase = await createClient();
  const range = getDateRange(preset, customStart, customEnd);

  const [newCustomersResult, ordersResult] = await Promise.all([
    supabase
      .from('customers')
      .select('id, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', range.startDate)
      .lt('created_at', range.endDate),
    supabase
      .from('orders')
      .select('customer_id, payment_status')
      .eq('tenant_id', tenantId)
      .eq('payment_status', 'paid')
      .gte('created_at', range.startDate)
      .lt('created_at', range.endDate),
  ]);

  const newCustomers = newCustomersResult.data?.length ?? 0;

  const customerOrderCount = new Map<string, number>();
  for (const order of ordersResult.data ?? []) {
    if (order.customer_id) {
      customerOrderCount.set(order.customer_id, (customerOrderCount.get(order.customer_id) ?? 0) + 1);
    }
  }

  const repeatCustomers = Array.from(customerOrderCount.values()).filter(count => count > 1).length;

  const { count: totalCustomersCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  return {
    newCustomers,
    repeatCustomers,
    totalCustomers: totalCustomersCount ?? 0,
  };
}

function getMonthToDateBounds() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const currentMonthEnd = new Date(today.getTime() + 86400000).toISOString();

  const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthEndDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  const clampedDay = Math.min(today.getDate(), prevMonthEndDay);
  const prevMonthStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1).toISOString();
  const prevMonthEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), clampedDay, 23, 59, 59, 999).toISOString();

  return {
    currentStart: currentMonthStart,
    currentEnd: currentMonthEnd,
    previousStart: prevMonthStart,
    previousEnd: prevMonthEnd,
  };
}

export async function getRevenueGrowth(tenantId: string): Promise<GrowthIndicator> {
  const supabase = await createClient();
  const bounds = getMonthToDateBounds();

  const [currentResult, previousResult] = await Promise.all([
    supabase
      .from('orders')
      .select('subtotal')
      .eq('tenant_id', tenantId)
      .eq('payment_status', 'paid')
      .gte('created_at', bounds.currentStart)
      .lt('created_at', bounds.currentEnd),
    supabase
      .from('orders')
      .select('subtotal')
      .eq('tenant_id', tenantId)
      .eq('payment_status', 'paid')
      .gte('created_at', bounds.previousStart)
      .lte('created_at', bounds.previousEnd),
  ]);

  const current = (currentResult.data ?? []).reduce((sum, o) => sum + Number(o.subtotal), 0);
  const previous = (previousResult.data ?? []).reduce((sum, o) => sum + Number(o.subtotal), 0);

  let percentage: number | null = null;
  if (previous > 0) {
    percentage = ((current - previous) / previous) * 100;
  } else if (current > 0) {
    percentage = 100;
  }

  return { current, previous, percentage };
}

export async function getOrderGrowth(tenantId: string): Promise<GrowthIndicator> {
  const supabase = await createClient();
  const bounds = getMonthToDateBounds();

  const [currentResult, previousResult] = await Promise.all([
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', bounds.currentStart)
      .lt('created_at', bounds.currentEnd),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', bounds.previousStart)
      .lte('created_at', bounds.previousEnd),
  ]);

  const current = currentResult.count ?? 0;
  const previous = previousResult.count ?? 0;

  let percentage: number | null = null;
  if (previous > 0) {
    percentage = ((current - previous) / previous) * 100;
  } else if (current > 0) {
    percentage = 100;
  }

  return { current, previous, percentage };
}
