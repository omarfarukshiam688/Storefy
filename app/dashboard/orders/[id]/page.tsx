import { redirect } from 'next/navigation';
import { getTenantContext } from '@/lib/auth/tenant';
import { getOrder } from '@/lib/orders';
import { OrderDetailPageClient } from '@/components/admin/order-detail-page-client';

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const context = await getTenantContext();

  if (!context.activeTenant) {
    redirect('/dashboard/onboarding');
  }

  const { id } = await params;
  const order = await getOrder(context.activeTenant.id, id);

  return (
    <OrderDetailPageClient
      order={order}
      items={order.items}
    />
  );
}
