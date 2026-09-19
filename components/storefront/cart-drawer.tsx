'use client';

import * as React from 'react';
import Link from 'next/link';
import { X, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart/cart-context';
import { CartItemComponent } from './cart-item';
import { cn } from '@/lib/utils';

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

export function CartDrawer() {
  const { items, isCartOpen, closeCart, clearCart, subtotal, tenantSlug } = useCart();

  const currency = items[0]?.currency || 'USD';
  const symbol = currencySymbols[currency] || currency;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        isCartOpen ? 'visible' : 'invisible'
      )}
    >
      <div
        className={cn(
          'absolute inset-0 bg-slate-950/25 backdrop-blur-sm transition-opacity duration-300',
          isCartOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={closeCart}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            closeCart();
          }
        }}
        role="presentation"
        tabIndex={-1}
      />
      <div
        className={cn(
          'absolute inset-y-0 right-0 z-50 w-[92%] max-w-md border-l border-white/30 bg-white/90 shadow-2xl backdrop-blur-xl flex flex-col transition-transform duration-300 ease-out',
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200/70 p-5">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-slate-700" />
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-slate-900">Shopping Cart</h2>
            {items.length > 0 && (
              <span className="text-sm text-muted-foreground">
                ({items.reduce((sum, i) => sum + i.quantity, 0)}{' '}
                {items.reduce((sum, i) => sum + i.quantity, 0) === 1 ? 'item' : 'items'})
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={closeCart} aria-label="Close cart">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Your cart is empty</h3>
              <p className="mt-2 max-w-sm text-sm text-slate-600">
                Looks like you haven&apos;t added anything to your cart yet.
              </p>
              <Button className="mt-6" onClick={closeCart}>
                Continue shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <CartItemComponent key={item.productId} item={item} />
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-slate-200/70 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Subtotal</span>
              <span className="text-xl font-bold tracking-[-0.03em]">
                {symbol}{subtotal.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Shipping and taxes calculated at checkout</p>
            <div className="grid gap-2">
              <Button className="w-full" size="lg" asChild>
                <Link href={`/s/${tenantSlug}/checkout`} onClick={closeCart}>
                  Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full" onClick={clearCart}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear cart
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
