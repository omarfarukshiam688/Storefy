import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/storefront';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

interface SuccessPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ orderNumber?: string }>;
}

export async function generateMetadata({ params }: SuccessPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    return { title: 'Store not found' };
  }
  return { title: `Order Confirmed - ${tenant.name}` };
}

export default async function SuccessPage({ params, searchParams }: SuccessPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const orderNumber = resolvedSearchParams.orderNumber;

  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-[-0.04em] text-slate-900 sm:text-3xl">
          Order Confirmed!
        </h1>
        {orderNumber && (
          <p className="mt-2 text-sm text-slate-600">
            Order number: <span className="font-mono font-semibold">{orderNumber}</span>
          </p>
        )}
        <p className="mt-2 text-sm text-slate-600">
          Thank you for your purchase. We&apos;ll send you updates about your order.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href={`/s/${slug}`}>Continue shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
