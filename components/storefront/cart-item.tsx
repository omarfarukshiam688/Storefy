'use client';

import Image from 'next/image';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CartItem } from '@/lib/cart/types';
import { useCart } from '@/lib/cart/cart-context';

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

export function CartItemComponent({ item }: { item: CartItem }) {
  const { updateQuantity, removeFromCart } = useCart();
  const symbol = currencySymbols[item.currency] || item.currency;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-50 to-sky-50">
            <span className="text-sm font-semibold text-slate-400">
              {item.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-slate-900 truncate">{item.name}</h3>
        <p className="mt-1 text-sm font-medium text-slate-600">
          {symbol}{item.price.toFixed(2)}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
          disabled={item.quantity >= 99}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="w-24 text-right">
        <p className="text-sm font-semibold tabular-nums">
          {symbol}{(item.price * item.quantity).toFixed(2)}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-400 hover:text-destructive shrink-0"
        onClick={() => removeFromCart(item.productId)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
