import { requireSuperAdmin } from '@/lib/auth/tenant';
import PaymentDetailsClient from './page-client';

interface PaymentDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function PaymentDetailsPage({
  params,
}: PaymentDetailsPageProps) {
  await requireSuperAdmin();
  const { id } = await params;

  return <PaymentDetailsClient paymentId={id} />;
}
