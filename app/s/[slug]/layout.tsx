import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StoreHeader } from '@/components/storefront/store-header';
import { StoreFooter } from '@/components/storefront/store-footer';
import { PageTransition } from '@/components/storefront/page-transition';
import { getTenantBySlug, getStoreLogoUrl, getStoreFaviconUrl } from '@/lib/storefront';

interface StorefrontLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StorefrontLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    return {
      title: 'Store not found',
    };
  }

  const settings = tenant.settings as Record<string, unknown> | null;
  const description = settings?.description as string | undefined;
  const faviconPath = settings?.favicon_url as string | undefined;
  const faviconUrl = await getStoreFaviconUrl(faviconPath);

  return {
    title: tenant.name,
    description: description || `Welcome to ${tenant.name}`,
    icons: faviconUrl ? { icon: faviconUrl } : undefined,
    openGraph: {
      title: tenant.name,
      description: description || `Welcome to ${tenant.name}`,
      type: 'website',
    },
  };
}

export default async function StorefrontLayout({
  children,
  params,
}: StorefrontLayoutProps) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  const settings = tenant.settings as Record<string, unknown> | null;
  const logoPath = settings?.logo_url as string | undefined;
  const logoUrl = await getStoreLogoUrl(logoPath);
  const primaryColor = (settings?.primary_color as string) || '#111111';

  return (
    <div
      className="min-h-screen bg-white text-slate-900"
      style={
        {
          '--brand-primary': primaryColor,
        } as React.CSSProperties
      }
    >
      <StoreHeader storeName={tenant.name} logoUrl={logoUrl} primaryColor={primaryColor} tenant={tenant} />
      <main className="flex-1">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
      <StoreFooter tenant={tenant} />
    </div>
  );
}
