import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import type { Customer, CustomerStatus, Order } from '@/types';
import { normalizeOrder } from '@/lib/orders';

export interface CustomerFilters {
  search?: string;
  status?: CustomerStatus | 'all';
  sort_by?: 'created_at' | 'updated_at' | 'name' | 'phone';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface PaginatedCustomers {
  customers: Customer[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CustomerWithStats extends Customer {
  total_orders: number;
  total_spending: number;
  last_order_at: string | null;
}

export interface CustomerOrdersResult {
  orders: Order[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

function normalizeCustomer(raw: Partial<Customer>): Customer {
  const status: CustomerStatus = ['active', 'inactive', 'blocked'].includes(raw.status as CustomerStatus)
    ? (raw.status as CustomerStatus)
    : 'active';

  return {
    id: raw.id ?? '',
    tenant_id: raw.tenant_id ?? '',
    name: raw.name ?? '',
    phone: raw.phone ?? '',
    email: raw.email ?? null,
    address: raw.address ?? null,
    district: raw.district ?? null,
    notes: raw.notes ?? null,
    status,
    created_at: raw.created_at ?? new Date().toISOString(),
    updated_at: raw.updated_at ?? new Date().toISOString(),
  };
}

async function getSupabase() {
  return createClient();
}

export async function listCustomers(tenantId: string, filters: CustomerFilters = {}): Promise<PaginatedCustomers> {
  const supabase = await getSupabase();
  const page = filters.page ?? 1;
  const pageSize = filters.page_size ?? 15;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
  }

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const sortBy = filters.sort_by ?? 'created_at';
  const sortOrder = filters.sort_order ?? 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) {
    throw new Error(`Failed to fetch customers: ${error.message}`);
  }

  const customers = (data ?? []).map(normalizeCustomer);
  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return {
    customers,
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
  };
}

export async function getCustomer(tenantId: string, customerId: string): Promise<Customer> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', customerId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Customer not found');
  }

  return normalizeCustomer(data);
}

export async function getCustomerByPhone(tenantId: string, phone: string): Promise<Customer | null> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('phone', phone)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalizeCustomer(data);
}

export async function getCustomerByEmail(tenantId: string, email: string): Promise<Customer | null> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('email', email)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalizeCustomer(data);
}

export async function upsertCustomerFromOrder(
  tenantId: string,
  customerData: {
    name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
    district?: string | null;
    notes?: string | null;
  },
  supabase?: ReturnType<typeof createServiceClient>
): Promise<Customer> {
  const db = supabase ?? await getSupabase();
  const phone = customerData.phone.trim();
  const email = typeof customerData.email === 'string' && customerData.email.trim() !== '' ? customerData.email.trim() : null;

  let customer = await getCustomerByPhone(tenantId, phone);

  if (!customer && email) {
    customer = await getCustomerByEmail(tenantId, email);
  }

  const now = new Date().toISOString();

  if (customer) {
    const updatePayload: Record<string, unknown> = {
      updated_at: now,
    };

    if (customerData.name.trim() && customerData.name.trim() !== customer.name) {
      updatePayload.name = customerData.name.trim();
    }
    if (phone !== customer.phone) {
      updatePayload.phone = phone;
    }
    if (email && email !== customer.email) {
      updatePayload.email = email;
    }
    if (customerData.address !== undefined && customerData.address !== customer.address) {
      updatePayload.address = customerData.address;
    }
    if (customerData.district !== undefined && customerData.district !== customer.district) {
      updatePayload.district = customerData.district;
    }
    if (customerData.notes !== undefined && customerData.notes !== customer.notes) {
      updatePayload.notes = customerData.notes;
    }

    if (Object.keys(updatePayload).length > 1) {
      const { data: updated, error: updateError } = await db
        .from('customers')
        .update(updatePayload)
        .eq('id', customer.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update customer: ${updateError.message}`);
      }

      return normalizeCustomer(updated);
    }

    return customer;
  }

  const { data: created, error: insertError } = await db
    .from('customers')
    .insert({
      tenant_id: tenantId,
      name: customerData.name.trim(),
      phone,
      email,
      address: customerData.address ?? null,
      district: customerData.district ?? null,
      notes: customerData.notes ?? null,
      status: 'active',
    })
    .select()
    .single();

  if (insertError || !created) {
    throw new Error(insertError?.message ?? 'Failed to create customer');
  }

  return normalizeCustomer(created);
}

export async function updateCustomer(
  tenantId: string,
  customerId: string,
  updates: {
    name?: string;
    phone?: string;
    email?: string | null;
    address?: string | null;
    district?: string | null;
    notes?: string | null;
    status?: CustomerStatus;
  }
): Promise<Customer> {
  const supabase = await getSupabase();

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.phone !== undefined) payload.phone = updates.phone.trim();
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.address !== undefined) payload.address = updates.address;
  if (updates.district !== undefined) payload.district = updates.district;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.status !== undefined) {
    if (!['active', 'inactive', 'blocked'].includes(updates.status)) {
      throw new Error('Invalid customer status');
    }
    payload.status = updates.status;
  }

  const { data, error } = await supabase
    .from('customers')
    .update(payload)
    .eq('tenant_id', tenantId)
    .eq('id', customerId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update customer');
  }

  return normalizeCustomer(data);
}

export async function getCustomerStats(tenantId: string, customerId: string): Promise<{
  total_orders: number;
  total_spending: number;
  last_order_at: string | null;
}> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from('orders')
    .select('subtotal, payment_status, created_at')
    .eq('tenant_id', tenantId)
    .eq('customer_id', customerId);

  if (error) {
    throw new Error(`Failed to fetch customer stats: ${error.message}`);
  }

  const orders = data ?? [];
  const totalOrders = orders.length;
  let totalSpending = 0;
  let lastOrderAt: string | null = null;

  for (const order of orders) {
    if (order.payment_status === 'paid') {
      totalSpending += Number(order.subtotal ?? 0);
    }
    if (!lastOrderAt || new Date(order.created_at) > new Date(lastOrderAt)) {
      lastOrderAt = order.created_at;
    }
  }

  return {
    total_orders: totalOrders,
    total_spending: totalSpending,
    last_order_at: lastOrderAt,
  };
}

export async function getCustomerOrders(
  tenantId: string,
  customerId: string,
  filters: { page?: number; page_size?: number; sort_by?: string; sort_order?: string } = {}
): Promise<CustomerOrdersResult> {
  const supabase = await getSupabase();
  const page = filters.page ?? 1;
  const pageSize = filters.page_size ?? 10;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('customer_id', customerId);

  const sortBy = filters.sort_by ?? 'created_at';
  const sortOrder = filters.sort_order ?? 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) {
    throw new Error(`Failed to fetch customer orders: ${error.message}`);
  }

  const orders = (data ?? []).map(normalizeOrder);
  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return {
    orders,
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
  };
}

export async function searchCustomersForSelect(
  tenantId: string,
  query: string
): Promise<Customer[]> {
  const supabase = await getSupabase();

  const term = `%${query}%`;
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
    .order('name', { ascending: true })
    .limit(10);

  if (error) {
    return [];
  }

  return (data ?? []).map(normalizeCustomer);
}
