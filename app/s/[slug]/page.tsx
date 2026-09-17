import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/storefront/product-grid';
import { CategoryNav } from '@/components/storefront/category-nav';
import { EmptyState } from '@/components/storefront/empty-state';
import {
  getTenantBySlug,
  getFeaturedProducts,
  getStorefrontCategories,
  getStorefrontProducts,
  getPrimaryImageUrlsForProducts,
} from '@/lib/storefront';

interface StoreHomePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StoreHomePageProps): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    return { title: 'Store not found' };
  }

  const settings = tenant.settings as Record<string, unknown> | null;
  const description = settings?.description as string | undefined;

  return {
    title: `Welcome to ${tenant.name}`,
    description: description || `Shop the best products at ${tenant.name}`,
    openGraph: {
      title: `Welcome to ${tenant.name}`,
      description: description || `Shop the best products at ${tenant.name}`,
      type: 'website',
    },
  };
}

export default async function StoreHomePage({ params }: StoreHomePageProps) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    return null;
  }

  const settings = tenant.settings as Record<string, unknown> | null;
  const description = settings?.description as string | undefined;

  const [featuredProducts, categories, allProducts] = await Promise.all([
    getFeaturedProducts(tenant.id, 8),
    getStorefrontCategories(tenant.id),
    getStorefrontProducts(tenant.id, { page_size: 8 }),
  ]);

  const displayProducts = featuredProducts.length > 0 ? featuredProducts : allProducts.products;
  const featuredProductIds = displayProducts.map((p) => p.id);
  const imageUrlMap = await getPrimaryImageUrlsForProducts(tenant.id, featuredProductIds);

  return (
    <div>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-[400px] bg-[radial-gradient(circle_at_top,_rgba(167,139,250,0.2),_transparent_50%),radial-gradient(circle_at_80%_20%,_rgba(125,211,252,0.18),_transparent_35%)]" />

        <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="max-w-2xl">
            {description && (
              <p className="text-base leading-7 text-slate-600 sm:text-lg">
                {description}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="./products">
                  Browse Products
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="border-t border-slate-100 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-900">
              Categories
            </h2>
            <div className="mt-5">
              <CategoryNav categories={categories} />
            </div>
          </div>
        </section>
      )}

      {featuredProducts.length > 0 && (
        <section className="border-t border-slate-100 bg-slate-50/50">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-[-0.04em] text-slate-900 sm:text-3xl">
                  Featured Products
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Handpicked selections from our store
                </p>
              </div>
              <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                <Link href="./products">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-8">
              <ProductGrid products={featuredProducts} imageUrls={imageUrlMap} />
            </div>

            <div className="mt-8 sm:hidden">
              <Button asChild variant="outline" className="w-full">
                <Link href="./products">
                  View all products
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {featuredProducts.length === 0 && displayProducts.length > 0 && (
        <section className="border-t border-slate-100 bg-slate-50/50">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-[-0.04em] text-slate-900 sm:text-3xl">
                  Latest Products
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Fresh arrivals from our store
                </p>
              </div>
              <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                <Link href="./products">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-8">
              <ProductGrid products={displayProducts} imageUrls={imageUrlMap} />
            </div>

            <div className="mt-8 sm:hidden">
              <Button asChild variant="outline" className="w-full">
                <Link href="./products">
                  View all products
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {featuredProducts.length === 0 && categories.length === 0 && (
        <section className="border-t border-slate-100">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <EmptyState
              title="No products yet"
              description="This store is getting ready. Check back soon for amazing products."
            />
          </div>
        </section>
      )}
    </div>
  );
}
