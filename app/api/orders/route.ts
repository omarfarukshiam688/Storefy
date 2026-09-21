import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { listOrders } from '@/lib/orders';
import type { OrderStatus, PaymentStatus } from '@/types';
import { handleAuthError } from '@/lib/auth/errors';

export interface OrderListFilters {
  search?: string;
  order_status?: OrderStatus | 'all';
  payment_status?: PaymentStatus | 'all';
  sort_by?: 'created_at' | 'updated_at' | 'order_number' | 'customer_name';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export async function GET(req: NextRequest) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const filters: OrderListFilters = {
      search: searchParams.get('search') || undefined,
      order_status: (searchParams.get('order_status') as OrderStatus | 'all') || undefined,
      payment_status: (searchParams.get('payment_status') as PaymentStatus | 'all') || undefined,
      sort_by: searchParams.get('sort_by') as OrderListFilters['sort_by'] | undefined,
      sort_order: searchParams.get('sort_order') as 'asc' | 'desc' | undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      page_size: searchParams.get('page_size') ? parseInt(searchParams.get('page_size')!) : undefined,
    };

    const result = await listOrders(context.activeTenant.id, filters);
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Orders list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
