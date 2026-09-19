import { redirect } from 'next/navigation';
import { getTenantContext } from '@/lib/auth/tenant';
import { listOrders } from '@/lib/orders';
import { OrdersPageClient } from '@/components/admin/orders-page-client';
import type { OrderStatus, PaymentStatus } from '@/types';

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getTenantContext();

  if (!context.activeTenant) {
    redirect('/dashboard/onboarding');
  }

  const tenant = context.activeTenant;
  const resolvedParams = await searchParams;

  const ordersResult = await listOrders(tenant.id, {
    search: typeof resolvedParams.search === 'string' ? resolvedParams.search : undefined,
    order_status: typeof resolvedParams.order_status === 'string' ? resolvedParams.order_status as OrderStatus | 'all' : undefined,
    payment_status: typeof resolvedParams.payment_status === 'string' ? resolvedParams.payment_status as PaymentStatus | 'all' : undefined,
    sort_by: resolvedParams.sort_by as 'created_at' | 'updated_at' | 'order_number' | 'customer_name' | undefined,
    sort_order: resolvedParams.sort_order as 'asc' | 'desc' | undefined,
    page: typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : undefined,
    page_size: typeof resolvedParams.page_size === 'string' ? parseInt(resolvedParams.page_size) : undefined,
  });

  return (
    <OrdersPageClient
      initialOrders={ordersResult.orders}
      initialTotal={ordersResult.total}
      initialPage={ordersResult.page}
      initialTotalPages={ordersResult.total_pages}
    />
  );
}
