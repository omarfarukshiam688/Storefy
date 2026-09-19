import { redirect } from 'next/navigation';
import { getTenantContext } from '@/lib/auth/tenant';
import { listCustomers } from '@/lib/customers';
import { CustomersPageClient } from '@/components/admin/customers-page-client';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getTenantContext();

  if (!context.activeTenant) {
    redirect('/dashboard/onboarding');
  }

  const resolvedParams = await searchParams;
  const customersResult = await listCustomers(context.activeTenant.id, {
    search: typeof resolvedParams.search === 'string' ? resolvedParams.search : undefined,
    status: typeof resolvedParams.status === 'string' ? resolvedParams.status as 'active' | 'inactive' | 'blocked' | 'all' : undefined,
    sort_by: resolvedParams.sort_by as 'created_at' | 'updated_at' | 'name' | 'phone' | undefined,
    sort_order: resolvedParams.sort_order as 'asc' | 'desc' | undefined,
    page: typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : undefined,
    page_size: typeof resolvedParams.page_size === 'string' ? parseInt(resolvedParams.page_size) : undefined,
  });

  return (
    <CustomersPageClient
      initialCustomers={customersResult.customers}
      initialTotal={customersResult.total}
      initialPage={customersResult.page}
      initialTotalPages={customersResult.total_pages}
    />
  );
}
