import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/storefront';
import { getOrderByNumber } from '@/lib/orders';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';

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

  const order = orderNumber ? await getOrderByNumber(tenant.id, orderNumber).catch(() => null) : null;

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

        {order && (
          <div className="mt-8 w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm text-left">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400 mb-3">
              Order Summary
            </h3>
            <div className="space-y-2">
              {order.items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 truncate flex-1 mr-3">
                    {item.product_name_snapshot} x {item.quantity}
                  </span>
                  <span className="font-medium whitespace-nowrap">
                    ${item.item_total.toFixed(2)}
                  </span>
                </div>
              ))}
              {order.items.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{order.items.length - 3} more item{order.items.length - 3 > 1 ? 's' : ''}
                </p>
              )}
              <div className="border-t border-slate-200 pt-2 mt-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">Total</span>
                <span className="text-base font-bold">
                  ${(order.subtotal + order.delivery_charge).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <Button asChild>
            <Link href={`/s/${slug}`}>
              Continue shopping
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
