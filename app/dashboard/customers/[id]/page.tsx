import { redirect } from 'next/navigation';
import { getTenantContext } from '@/lib/auth/tenant';
import { getCustomer, getCustomerStats, getCustomerOrders } from '@/lib/customers';
import { CustomerDetailPageClient } from '@/components/admin/customer-detail-page-client';

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const context = await getTenantContext();

  if (!context.activeTenant) {
    redirect('/dashboard/onboarding');
  }

  const { id } = await params;
  const customer = await getCustomer(context.activeTenant.id, id);
  const stats = await getCustomerStats(context.activeTenant.id, id);
  const ordersResult = await getCustomerOrders(context.activeTenant.id, id, { page: 1, page_size: 10 });

  return (
    <CustomerDetailPageClient
      customer={customer}
      stats={stats}
      orders={ordersResult.orders}
    />
  );
}
