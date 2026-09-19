import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/storefront';
import CartPageClient from './cart-client';

interface CartPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CartPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    return { title: 'Store not found' };
  }
  return { title: `Shopping Cart - ${tenant.name}` };
}

export default async function CartPage({ params }: CartPageProps) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    notFound();
  }

  return <CartPageClient tenantSlug={slug} />;
}
