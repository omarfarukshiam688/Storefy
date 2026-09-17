import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StoreHeader } from '@/components/storefront/store-header';
import { StoreFooter } from '@/components/storefront/store-footer';
import { getTenantBySlug } from '@/lib/storefront';

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

  return {
    title: tenant.name,
    description: description || `Welcome to ${tenant.name}`,
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
  const logoUrl = settings?.logo_url as string | undefined;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <StoreHeader storeName={tenant.name} logoUrl={logoUrl} />
      <main className="flex-1">{children}</main>
      <StoreFooter tenant={tenant} />
    </div>
  );
}
