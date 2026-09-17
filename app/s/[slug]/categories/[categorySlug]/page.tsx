import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/storefront/product-grid';
import { SearchBar } from '@/components/storefront/search-bar';
import { SortSelect } from '@/components/storefront/sort-select';
import { EmptyState } from '@/components/storefront/empty-state';
import {
  getTenantBySlug,
  getStorefrontCategory,
  getStorefrontProducts,
  getPrimaryImageUrlsForProducts,
} from '@/lib/storefront';

interface CategoryPageProps {
  params: Promise<{ slug: string; categorySlug: string }>;
  searchParams: Promise<{ q?: string; sort_by?: string; sort_order?: string; page?: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug, categorySlug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    return { title: 'Store not found' };
  }

  const category = await getStorefrontCategory(tenant.id, categorySlug);

  if (!category) {
    return { title: 'Category not found' };
  }

  return {
    title: `${category.name} - ${tenant.name}`,
    description: category.description || `Browse ${category.name} products at ${tenant.name}`,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug, categorySlug } = await params;
  const resolvedSearchParams = await searchParams;

  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  const category = await getStorefrontCategory(tenant.id, categorySlug);

  if (!category) {
    notFound();
  }

  const search = resolvedSearchParams.q || '';
  const sortBy = resolvedSearchParams.sort_by || 'created_at';
  const sortOrder = resolvedSearchParams.sort_order || 'desc';
  const page = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page) : 1;

  const productsResult = await getStorefrontProducts(tenant.id, {
    search: search || undefined,
    category_id: category.id,
    sort_by: sortBy as 'created_at' | 'updated_at' | 'name' | 'price',
    sort_order: sortOrder as 'asc' | 'desc',
    page,
    page_size: 12,
  });

  const productIds = productsResult.products.map((p) => p.id);
  const imageUrlMap = await getPrimaryImageUrlsForProducts(tenant.id, productIds);

  const buildPageUrl = (newPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    params.set('category_id', category.id);
    if (sortBy !== 'created_at') params.set('sort_by', sortBy);
    if (sortOrder !== 'desc') params.set('sort_order', sortOrder);
    if (newPage > 1) params.set('page', String(newPage));
    const qs = params.toString();
    return qs ? `.?${qs}` : '.';
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
          <Link href="/">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to store
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-[-0.04em] text-slate-900 sm:text-4xl">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-2 text-sm text-slate-600">{category.description}</p>
        )}
        <p className="mt-2 text-sm text-slate-600">
          {productsResult.total} {productsResult.total === 1 ? 'product' : 'products'}
        </p>
      </div>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar className="w-full lg:max-w-md" />
        <SortSelect
          currentSort={sortBy}
          currentOrder={sortOrder}
          search={search}
          categoryId={category.id}
        />
      </div>

      {productsResult.products.length > 0 ? (
        <>
          <ProductGrid products={productsResult.products} imageUrls={imageUrlMap} />

          {productsResult.total_pages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                asChild={page > 1}
              >
                {page > 1 ? (
                  <Link href={buildPageUrl(page - 1)}>Previous</Link>
                ) : (
                  <span>Previous</span>
                )}
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(productsResult.total_pages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (productsResult.total_pages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= productsResult.total_pages - 2) {
                    pageNum = productsResult.total_pages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? 'default' : 'ghost'}
                      size="sm"
                      asChild
                      className="min-w-[2.25rem]"
                    >
                      <Link href={buildPageUrl(pageNum)}>{pageNum}</Link>
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= productsResult.total_pages}
                asChild={page < productsResult.total_pages}
              >
                {page < productsResult.total_pages ? (
                  <Link href={buildPageUrl(page + 1)}>Next</Link>
                ) : (
                  <span>Next</span>
                )}
              </Button>
            </nav>
          )}
        </>
      ) : (
        <EmptyState
          title="No products in this category"
          description="Check back later for new arrivals in this category."
        />
      )}
    </div>
  );
}
