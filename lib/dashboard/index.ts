import { createClient } from '@/lib/supabase/server';

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalCustomers: number;
  activeProducts: number;
  totalRevenue: number;
  paidOrdersCount: number;
}

export interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  order_status: string;
  payment_status: string;
  subtotal: number;
  delivery_charge: number;
  created_at: string;
}

export async function getDashboardStats(tenantId: string): Promise<DashboardStats> {
  const supabase = await createClient();

  const [
    totalOrdersResult,
    pendingOrdersResult,
    completedOrdersResult,
    totalCustomersResult,
    activeProductsResult,
    paidOrdersResult,
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('order_status', 'pending'),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('order_status', ['delivered', 'processing', 'shipped']),
    supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('is_archived', false),
    supabase
      .from('orders')
      .select('subtotal')
      .eq('tenant_id', tenantId)
      .eq('payment_status', 'paid'),
  ]);

  const totalRevenue = (paidOrdersResult.data ?? []).reduce(
    (sum, order) => sum + Number(order.subtotal),
    0
  );

  return {
    totalOrders: totalOrdersResult.count ?? 0,
    pendingOrders: pendingOrdersResult.count ?? 0,
    completedOrders: completedOrdersResult.count ?? 0,
    totalCustomers: totalCustomersResult.count ?? 0,
    activeProducts: activeProductsResult.count ?? 0,
    totalRevenue,
    paidOrdersCount: paidOrdersResult.data?.length ?? 0,
  };
}

export async function getRecentOrders(
  tenantId: string,
  limit = 5
): Promise<RecentOrder[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, customer_name, order_status, payment_status, subtotal, delivery_charge, created_at'
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch recent orders: ${error.message}`);
  }

  return (data ?? []) as RecentOrder[];
}
