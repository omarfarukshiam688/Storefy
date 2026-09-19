import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/storefront';
import CheckoutClient from './checkout-client';

interface CheckoutPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CheckoutPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    return { title: 'Store not found' };
  }
  return { title: `Checkout - ${tenant.name}` };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    notFound();
  }

  return <CheckoutClient tenantSlug={slug} />;
}
