'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart/cart-context';
import { Button } from '@/components/ui/button';
import { CartItemComponent } from '@/components/storefront/cart-item';
import { EmptyState } from '@/components/storefront/empty-state';
import { Trash2, ArrowRight } from 'lucide-react';

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

export default function CartPageClient({ tenantSlug }: { tenantSlug: string }) {
  const { items, clearCart, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          title="Your cart is empty"
          description="Looks like you haven't added anything to your cart yet."
        />
        <div className="mt-8 flex justify-center">
          <Button asChild>
            <Link href={`/s/${tenantSlug}/products`}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Continue shopping
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const currency = items[0]?.currency || 'USD';
  const symbol = currencySymbols[currency] || currency;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-[-0.04em] text-slate-900 sm:text-4xl">
          Shopping Cart
        </h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearCart}
          className="text-destructive hover:text-destructive hover:bg-destructive/5"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear cart
        </Button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <CartItemComponent key={item.productId} item={item} />
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold tracking-tight">Order Summary</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {items.reduce((sum, i) => sum + i.quantity, 0)}{' '}
                  {items.reduce((sum, i) => sum + i.quantity, 0) === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-medium text-slate-600">Subtotal</span>
                <span className="text-xl font-bold tracking-[-0.03em]">
                  {symbol}{subtotal.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Shipping and taxes calculated at checkout</p>
              <Button className="w-full" size="lg" asChild>
                <Link href={`/s/${tenantSlug}/checkout`}>
                  Proceed to Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
