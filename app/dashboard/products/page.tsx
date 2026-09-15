import { redirect } from 'next/navigation';
import { getTenantContext } from '@/lib/auth/tenant';
import { listProducts, listCategories } from '@/lib/products';
import { DashboardHeader } from '@/components/auth/dashboard-header';
import { ProductsPageClient } from '@/components/admin/products-page-client';

export default async function ProductsPage({
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
  const [productsResult, categories] = await Promise.all([
    listProducts(tenant.id, {
      search: typeof resolvedParams.search === 'string' ? resolvedParams.search : undefined,
      category_id: typeof resolvedParams.category_id === 'string' ? resolvedParams.category_id : undefined,
      is_active: typeof resolvedParams.is_active === 'string' ? resolvedParams.is_active === 'true' : undefined,
      is_featured: typeof resolvedParams.is_featured === 'string' ? resolvedParams.is_featured === 'true' : undefined,
      sort_by: resolvedParams.sort_by as 'created_at' | 'updated_at' | 'name' | 'price' | undefined,
      sort_order: resolvedParams.sort_order as 'asc' | 'desc' | undefined,
      page: typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : undefined,
      page_size: typeof resolvedParams.page_size === 'string' ? parseInt(resolvedParams.page_size) : undefined,
    }),
    listCategories(tenant.id),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader profileName={context.profile.name} />
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl">
          <ProductsPageClient
            initialProducts={productsResult.products}
            initialCategories={categories}
            initialTotal={productsResult.total}
            initialPage={productsResult.page}
            initialTotalPages={productsResult.total_pages}
          />
        </div>
      </main>
    </div>
  );
}
