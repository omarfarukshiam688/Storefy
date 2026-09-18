import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/storefront/product-grid';
import { CategoryNav } from '@/components/storefront/category-nav';
import {
  getTenantBySlug,
  getFeaturedProducts,
  getStorefrontCategories,
  getPrimaryImageUrlsForProducts,
  getEnabledStorefrontSections,
  getHeroImageSignedUrl,
} from '@/lib/storefront';
import { HeroSection } from '@/components/storefront/hero-section';
import { WhyChooseUsSection } from '@/components/storefront/why-choose-us-section';
import { AboutUsSection } from '@/components/storefront/about-section';
import { ReviewsSection } from '@/components/storefront/reviews-section';
import { ContactSection } from '@/components/storefront/contact-section';
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
  const heroHeading = heroConfig?.heading as string | undefined;

  return {
    title: heroHeading ? `${heroHeading} - ${tenant.name}` : `Welcome to ${tenant.name}`,
    description: heroConfig?.subheading || description || `Shop the best products at ${tenant.name}`,
    openGraph: {
      title: heroHeading ? `${heroHeading} - ${tenant.name}` : `Welcome to ${tenant.name}`,
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

  const [sections, categories, allProducts] = await Promise.all([
    getEnabledStorefrontSections(tenant.id),
    getStorefrontCategories(tenant.id),
    getFeaturedProducts(tenant.id, 8),
  ]);

  const displayProducts = allProducts.length > 0 ? allProducts : [];
  const featuredProductIds = displayProducts.map((p) => p.id);
  const imageUrlMap = await getPrimaryImageUrlsForProducts(tenant.id, featuredProductIds);

  const heroSection = sections.find((s) => s.section_key === 'hero');
  const heroConfig = (heroSection?.config || {}) as unknown as HeroSectionConfig;
  const heroHeading = (heroConfig.heading as string) || '';
  const heroSubheading = (heroConfig.subheading as string) || '';
  const heroCtaLabel = (heroConfig.cta_label as string) || 'Explore Products';
  const heroCtaDestination = (heroConfig.cta_destination as string) || './products';
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

      {sections.find((s) => s.section_key === 'categories')?.is_enabled && categories.length > 0 && (
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

      {sections.find((s) => s.section_key === 'featured_products')?.is_enabled && displayProducts.length > 0 && (
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
        />
      )}

      {sections.find((s) => s.section_key === 'contact')?.is_enabled && (
        <ContactSection tenant={tenant} />
      )}
    </div>
  );
}
