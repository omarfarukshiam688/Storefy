import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageGallery } from '@/components/storefront/image-gallery';
import AddToCart from '@/components/storefront/add-to-cart';
import { cn } from '@/lib/utils';
import {
  getTenantBySlug,
  getStorefrontProduct,
  getProductImages,
  getStorefrontCategories,
  enrichProductImagesWithUrls,
} from '@/lib/storefront';
import { getProductReviews, getProductRatingSummary } from '@/lib/reviews';
import { ProductReviews } from '@/components/storefront/product-reviews';

import type { Category } from '@/types';

interface ProductDetailPageProps {
  params: Promise<{ slug: string; productSlug: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    return { title: 'Store not found' };
  }

  const product = await getStorefrontProduct(tenant.id, productSlug);

  if (!product) {
    return { title: 'Product not found' };
  }

  return {
    title: `${product.name} - ${tenant.name}`,
    description: product.description || product.short_description || `Buy ${product.name} at ${tenant.name}`,
    openGraph: {
      title: `${product.name} - ${tenant.name}`,
      description: product.description || product.short_description || `Buy ${product.name} at ${tenant.name}`,
      type: 'website',
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug, productSlug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  const product = await getStorefrontProduct(tenant.id, productSlug);

  if (!product) {
    notFound();
  }

  const [rawImages, categories, reviewsData, ratingSummary] = await Promise.all([
    getProductImages(tenant.id, product.id),
    getStorefrontCategories(tenant.id),
    getProductReviews(tenant.id, product.id, { page: 1, page_size: 10 }),
    getProductRatingSummary(tenant.id, product.id),
  ]);

  const images = await enrichProductImagesWithUrls(rawImages);

  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    BDT: '৳',
    INR: '₹',
    PKR: '₨',
    CAD: 'C$',
    AUD: 'A$',
  };
  const symbol = currencySymbols[product.currency] || product.currency;

  const isOutOfStock = product.stock_status === 'out_of_stock';
  const isPreorder = product.stock_status === 'preorder';
  const isBackorder = product.stock_status === 'backorder';

  const category = categories.find((c: Category) => c.id === product.category_id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="./products">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to products
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 lg:h-[calc(100vh-15rem)]">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <ImageGallery images={images} productName={product.name} />
        </div>

        <div className="flex flex-col lg:h-full lg:overflow-y-auto lg:pr-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-[-0.04em] text-slate-900 sm:text-3xl">
                {product.name}
              </h1>
              {category && (
                <Link
                  href={`../categories/${category.slug}`}
                  className="mt-2 inline-block text-sm font-medium text-violet-700 hover:text-violet-800"
                >
                  {category.name}
                </Link>
              )}
            </div>
            <span
              className={cn(
                'shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
                isOutOfStock
                  ? 'border border-red-200 bg-red-50 text-red-700'
                  : isPreorder || isBackorder
                    ? 'border border-amber-200 bg-amber-50 text-amber-700'
                    : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              )}
            >
              {isOutOfStock
                ? 'Out of stock'
                : isPreorder
                  ? 'Pre-order'
                  : isBackorder
                    ? 'Backorder'
                    : 'In stock'}
            </span>
          </div>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-bold tracking-[-0.04em] text-slate-900">
              {symbol}{product.price.toFixed(2)}
            </span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-base font-medium text-slate-400 line-through">
                {symbol}{product.compare_at_price.toFixed(2)}
              </span>
            )}
          </div>

          {(product.description || product.short_description) && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-900">
                Description
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                {product.description || product.short_description}
              </p>
            </div>
          )}

          {product.sku && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-900">
                SKU
              </h2>
              <p className="mt-2 font-mono text-sm text-slate-600">{product.sku}</p>
            </div>
          )}

          <div className="mt-8">
            <AddToCart product={product} imageUrl={images[0]?.url || null} />
          </div>

          <ProductReviews
            tenantSlug={slug}
            productId={product.id}
            initialReviews={reviewsData.reviews}
            initialSummary={ratingSummary}
            initialTotalPages={reviewsData.total_pages}
          />
        </div>
      </div>
    </div>
  );
}

