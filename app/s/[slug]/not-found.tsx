import { Metadata } from 'next';
import { StoreNotFound } from '@/components/storefront/store-not-found';

interface NotFoundPageProps {
  params?: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: NotFoundPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || 'store';
  return {
    title: `Store not found - ${slug}`,
  };
}

export default async function NotFoundPage({ params }: NotFoundPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || '';
  return <StoreNotFound slug={slug} />;
}
