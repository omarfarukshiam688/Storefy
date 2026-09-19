import { createClient } from '@/lib/supabase/server';
import type { Order, OrderItem, OrderStatus, PaymentStatus } from '@/types';
import { emitOrderEvent } from './events';
import type { OrderEventType } from './events';

export interface OrderFilters {
  search?: string;
  order_status?: OrderStatus | 'all';
  payment_status?: PaymentStatus | 'all';
  sort_by?: 'created_at' | 'updated_at' | 'order_number' | 'customer_name';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface PaginatedOrders {
  orders: Order[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export function normalizeOrder(raw: Partial<Order>): Order {
  const paymentStatus: PaymentStatus = ['pending', 'paid', 'failed', 'refunded'].includes(raw.payment_status as PaymentStatus)
    ? (raw.payment_status as PaymentStatus)
    : 'pending';

  const orderStatus: OrderStatus = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(raw.order_status as OrderStatus)
    ? (raw.order_status as OrderStatus)
    : 'pending';

  return {
    id: raw.id ?? '',
    tenant_id: raw.tenant_id ?? '',
    order_number: raw.order_number ?? '',
    customer_name: raw.customer_name ?? '',
    customer_email: raw.customer_email ?? null,
    phone_number: raw.phone_number ?? '',
    district: raw.district ?? '',
    delivery_address: raw.delivery_address ?? '',
    subtotal: Number(raw.subtotal ?? 0),
    delivery_charge: Number(raw.delivery_charge ?? 0),
    payment_method: raw.payment_method ?? 'pending',
    payment_status: paymentStatus,
    order_status: orderStatus,
    customer_id: raw.customer_id ?? null,
    notes: raw.notes ?? null,
    confirmed_at: raw.confirmed_at ?? null,
    processing_at: raw.processing_at ?? null,
    shipped_at: raw.shipped_at ?? null,
    delivered_at: raw.delivered_at ?? null,
    cancelled_at: raw.cancelled_at ?? null,
    created_at: raw.created_at ?? new Date().toISOString(),
    updated_at: raw.updated_at ?? new Date().toISOString(),
  };
}

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export function canTransitionTo(current: OrderStatus, next: OrderStatus): boolean {
  return VALID_TRANSITIONS[current]?.includes(next) ?? false;
}

export async function listOrders(tenantId: string, filters: OrderFilters = {}): Promise<PaginatedOrders> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.page_size ?? 15;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(`order_number.ilike.${term},customer_name.ilike.${term},phone_number.ilike.${term}`);
  }

  if (filters.order_status && filters.order_status !== 'all') {
    query = query.eq('order_status', filters.order_status);
  }

  if (filters.payment_status && filters.payment_status !== 'all') {
    query = query.eq('payment_status', filters.payment_status);
  }

  const sortBy = filters.sort_by ?? 'created_at';
  const sortOrder = filters.sort_order ?? 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) {
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }

  const orders = (data ?? []) as Order[];
  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  const normalizedOrders = orders.map(normalizeOrder);

  return {
    orders: normalizedOrders,
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
  };
}

export async function getOrder(tenantId: string, orderId: string): Promise<OrderWithItems> {
  const supabase = await createClient();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message ?? 'Order not found');
  }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (itemsError) {
    throw new Error(`Failed to fetch order items: ${itemsError.message}`);
  }

  return {
    ...normalizeOrder(order),
    items: (items ?? []) as OrderItem[],
  };
}

export async function getOrderByNumber(tenantId: string, orderNumber: string): Promise<OrderWithItems | null> {
  const supabase = await createClient();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('order_number', orderNumber)
    .single();

  if (orderError || !order) {
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  if (itemsError) {
    throw new Error(`Failed to fetch order items: ${itemsError.message}`);
  }

  return {
    ...normalizeOrder(order),
    items: (items ?? []) as OrderItem[],
  };
}

export async function updateOrderStatus(
  tenantId: string,
  orderId: string,
  nextStatus: OrderStatus
): Promise<Order> {
  const supabase = await createClient();

  const { data: currentOrder, error: fetchError } = await supabase
    .from('orders')
    .select('order_status')
    .eq('tenant_id', tenantId)
    .eq('id', orderId)
    .single();

  if (fetchError || !currentOrder) {
    throw new Error(fetchError?.message ?? 'Order not found');
  }

  const currentStatus = currentOrder.order_status as OrderStatus;

  if (!canTransitionTo(currentStatus, nextStatus)) {
    throw new Error(
      `Invalid status transition from ${currentStatus} to ${nextStatus}`
    );
  }

  const updatePayload: Record<string, unknown> = { order_status: nextStatus };

  if (nextStatus === 'confirmed') {
    updatePayload.confirmed_at = new Date().toISOString();
  } else if (nextStatus === 'processing') {
    updatePayload.processing_at = new Date().toISOString();
  } else if (nextStatus === 'shipped') {
    updatePayload.shipped_at = new Date().toISOString();
  } else if (nextStatus === 'delivered') {
    updatePayload.delivered_at = new Date().toISOString();
  } else if (nextStatus === 'cancelled') {
    updatePayload.cancelled_at = new Date().toISOString();
  }

  const { data: order, error: updateError } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('tenant_id', tenantId)
    .eq('id', orderId)
    .select()
    .single();

  if (updateError || !order) {
    throw new Error(updateError?.message ?? 'Failed to update order status');
  }

  const eventTypeMap: Record<OrderStatus, OrderEventType> = {
    pending: 'order.created',
    confirmed: 'order.confirmed',
    processing: 'order.processing',
    shipped: 'order.shipped',
    delivered: 'order.delivered',
    cancelled: 'order.cancelled',
  };

  emitOrderEvent({
    type: eventTypeMap[nextStatus],
    orderId: order.id,
    tenantId,
    previousStatus: currentStatus,
    nextStatus,
    timestamp: new Date().toISOString(),
  });

  return order as Order;
}

export async function updatePaymentStatus(
  tenantId: string,
  orderId: string,
  paymentStatus: PaymentStatus
): Promise<Order> {
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from('orders')
    .update({ payment_status: paymentStatus })
    .eq('tenant_id', tenantId)
    .eq('id', orderId)
    .select()
    .single();

  if (error || !order) {
    throw new Error(error?.message ?? 'Failed to update payment status');
  }

  emitOrderEvent({
    type: 'payment.updated',
    orderId: order.id,
    tenantId,
    nextStatus: paymentStatus,
    timestamp: new Date().toISOString(),
  });

  return order as Order;
}

export async function cancelOrder(tenantId: string, orderId: string): Promise<Order> {
  return updateOrderStatus(tenantId, orderId, 'cancelled');
}

export async function getOrderStats(tenantId: string): Promise<{
  total: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  totalRevenue: number;
}> {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from('orders')
    .select('order_status, subtotal, payment_status')
    .eq('tenant_id', tenantId);

  if (error) {
    throw new Error(`Failed to fetch order stats: ${error.message}`);
  }

  const stats = {
    total: orders?.length ?? 0,
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0,
  };

  for (const order of orders ?? []) {
    const status = order.order_status as OrderStatus;
    stats[status] = (stats[status] || 0) + 1;
    if (status !== 'cancelled' && order.payment_status === 'paid') {
      stats.totalRevenue += Number(order.subtotal);
    }
  }

  return stats;
}
