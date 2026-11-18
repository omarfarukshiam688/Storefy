import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/storefront/product-grid';
import {
  getTenantBySlug,
  getStorefrontCategories,
  getPrimaryImageUrlsForProducts,
  getStorefrontProducts,
  getEnabledStorefrontSections,
  getHeroImageSignedUrl,
} from '@/lib/storefront';
import { HeroSection } from '@/components/storefront/hero-section';
import { WhyChooseUsSection } from '@/components/storefront/why-choose-us-section';
import { AboutUsSection } from '@/components/storefront/about-section';
import { ReviewsSection } from '@/components/storefront/reviews-section';
import { ContactSection } from '@/components/storefront/contact-section';
import { getProductRatingSummaries, getStoreReviews } from '@/lib/reviews';
import type { HeroSectionConfig, WhyChooseUsSectionConfig, AboutUsSectionConfig, ReviewsSectionConfig } from '@/types';

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
  const sections = await getEnabledStorefrontSections(tenant.id);
  const heroSection = sections.find((s) => s.section_key === 'hero');
  const heroConfig = heroSection?.config as HeroSectionConfig | undefined;

  return {
    title: tenant.name,
    description: heroConfig?.subheading || description || `Shop the best products at ${tenant.name}`,
    openGraph: {
      title: tenant.name,
      description: heroConfig?.subheading || description || `Shop the best products at ${tenant.name}`,
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
  const primaryColor = (settings?.primary_color as string) || '#111111';

  const [sections, categories, storeReviews] = await Promise.all([
    getEnabledStorefrontSections(tenant.id),
    getStorefrontCategories(tenant.id),
    getStoreReviews(tenant.id, 5).catch(() => []),
  ]);

  const categorySections = await Promise.all(
    categories.map(async (category) => {
      const result = await getStorefrontProducts(tenant.id, {
        category_id: category.id,
        sort_by: 'created_at',
        sort_order: 'desc',
        page: 1,
        page_size: 3,
      });
      return { category, products: result.products, total: result.total };
    })
  );

  const categoryProductIds = categorySections.flatMap((section) => section.products.map((product) => product.id));
  const [imageUrlMap, ratingSummaries] = await Promise.all([
    getPrimaryImageUrlsForProducts(tenant.id, categoryProductIds),
    getProductRatingSummaries(tenant.id, categoryProductIds),
  ]);

  const heroSection = sections.find((s) => s.section_key === 'hero');
  const heroConfig = (heroSection?.config || {}) as unknown as HeroSectionConfig;
  const heroHeading = (heroConfig.heading as string) || '';
  const heroSubheading = (heroConfig.subheading as string) || '';
  const heroCtaLabel = (heroConfig.cta_label as string) || 'Explore Products';
  const configuredCtaDestination = (heroConfig.cta_destination as string) || '';
  const heroCtaDestination = heroCtaLabel.trim().toLowerCase() === 'explore products'
    ? `/s/${slug}/products`
    : configuredCtaDestination || `/s/${slug}/products`;
  const heroImagePath = (heroConfig.image_path as string | null) || null;
  let heroImageUrl: string | null = null;
  if (heroImagePath) {
    heroImageUrl = await getHeroImageSignedUrl(heroImagePath, 3600);
  }

  return (
    <div>
      {heroSection?.is_enabled && (
        <HeroSection
          heading={heroHeading}
          subheading={heroSubheading}
          ctaLabel={heroCtaLabel}
          ctaDestination={heroCtaDestination}
          imageUrl={heroImageUrl}
          primaryColor={primaryColor}
        />
      )}

      {categorySections.some((section) => section.products.length > 0) && (
        <div className="bg-white">
          {categorySections.map(({ category, products, total }) => products.length > 0 && (
            <section key={category.id} className="border-t border-slate-100/80">
              <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[21px] font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                    {category.name}
                  </h2>
                  <Link
                    href={`/s/${slug}/categories/${category.slug}`}
                    className="flex items-center text-sm font-bold text-blue-600 sm:text-base"
                  >
                    See All <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
                <ProductGrid
                  products={products}
                  imageUrls={imageUrlMap}
                  tenantSlug={slug}
                  compactMobile
                  ratingSummaries={ratingSummaries}
                />
                {total > 3 && (
                  <Button asChild className="mt-4 h-11 w-full rounded-full border-0 bg-blue-50 text-blue-700 hover:bg-blue-100 sm:hidden">
                    <Link href={`/s/${slug}/categories/${category.slug}`}>See All</Link>
                  </Button>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {sections.find((s) => s.section_key === 'why_choose_us')?.is_enabled && (
        <WhyChooseUsSection
          config={(sections.find((s) => s.section_key === 'why_choose_us')?.config || {}) as unknown as WhyChooseUsSectionConfig}
        />
      )}

      {sections.find((s) => s.section_key === 'about_us')?.is_enabled && (
        <AboutUsSection
          config={(sections.find((s) => s.section_key === 'about_us')?.config || {}) as unknown as AboutUsSectionConfig}
        />
      )}

      {sections.find((s) => s.section_key === 'reviews')?.is_enabled && (
        <ReviewsSection
          config={(sections.find((s) => s.section_key === 'reviews')?.config || {}) as unknown as ReviewsSectionConfig}
          reviews={storeReviews}
        />
      )}

      {sections.find((s) => s.section_key === 'contact')?.is_enabled && (
        <ContactSection tenant={tenant} />
      )}
    </div>
  );
}
