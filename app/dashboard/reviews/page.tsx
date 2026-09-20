import { redirect } from 'next/navigation';
import { getTenantContext } from '@/lib/auth/tenant';
import { listReviews } from '@/lib/reviews';
import { ReviewsPageClient } from '@/components/admin/reviews-page-client';

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getTenantContext();

  if (!context.activeTenant) {
    redirect('/dashboard/onboarding');
  }

  if (context.role !== 'tenant_admin') {
    redirect('/dashboard');
  }

  const tenant = context.activeTenant;
  const resolvedParams = await searchParams;

  const reviewsResult = await listReviews(tenant.id, {
    search: typeof resolvedParams.search === 'string' ? resolvedParams.search : undefined,
    status: typeof resolvedParams.status === 'string' ? resolvedParams.status as 'pending' | 'approved' | 'rejected' | 'hidden' | 'all' : undefined,
    sort_by: typeof resolvedParams.sort_by === 'string' ? resolvedParams.sort_by as 'created_at' | 'updated_at' | 'rating' | 'product_name' : undefined,
    sort_order: typeof resolvedParams.sort_order === 'string' ? resolvedParams.sort_order as 'asc' | 'desc' : undefined,
    page: typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : undefined,
    page_size: typeof resolvedParams.page_size === 'string' ? parseInt(resolvedParams.page_size) : undefined,
  });

  return (
    <ReviewsPageClient
      initialReviews={reviewsResult.reviews}
      initialTotal={reviewsResult.total}
      initialPage={reviewsResult.page}
      initialTotalPages={reviewsResult.total_pages}
    />
  );
}
