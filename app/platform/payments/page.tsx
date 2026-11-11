import { requireSuperAdmin } from '@/lib/auth/tenant';
import PaymentsListClient from './page-client';

interface PaymentsPageProps {
  searchParams: Promise<{ status?: string; purpose?: string; search?: string; page?: string; pageSize?: string }>;
}

export default async function PaymentsPage({
  searchParams,
}: PaymentsPageProps) {
  await requireSuperAdmin();

  const params = await searchParams;

  return (
    <PaymentsListClient
      initialStatus={params.status ?? 'verification_required'}
      initialPurpose={params.purpose ?? 'all'}
      initialSearch={params.search ?? ''}
      initialPage={parseInt(params.page ?? '1', 10)}
      initialPageSize={parseInt(params.pageSize ?? '20', 10)}
    />
  );
}
