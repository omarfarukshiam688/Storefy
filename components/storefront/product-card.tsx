'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Plus, Star } from 'lucide-react';
import { useCart } from '@/lib/cart/cart-context';
import type { Product, ReviewSummary } from '@/types';

interface ProductCardProps {
  product: Product;
  imageUrl?: string | null;
  tenantSlug: string;
  compact?: boolean;
  ratingSummary?: ReviewSummary;
}

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

export function ProductCard({ product, imageUrl, tenantSlug, compact = false, ratingSummary }: ProductCardProps) {
  const [imgError, setImgError] = React.useState(false);
  const showFallback = !imageUrl || imgError;
  const { addToCart } = useCart();

  const symbol = currencySymbols[product.currency] || product.currency;
  const isOutOfStock = product.stock_status === 'out_of_stock';
  const discount = product.compare_at_price && product.compare_at_price > product.price
    ? Math.round((1 - product.price / product.compare_at_price) * 100)
    : 0;

  return (
    <div className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
      <Link href={`/s/${tenantSlug}/products/${product.slug}`} className="block">
      <div className={cn('relative overflow-hidden bg-slate-50', compact ? 'aspect-[4/5]' : 'aspect-square')}>
        {showFallback ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-50 to-sky-50">
            <span className="text-lg font-semibold text-slate-400">
              {product.name.charAt(0).toUpperCase()}
            </span>
          </div>
        ) : (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-contain p-1 transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onError={() => setImgError(true)}
          />
        )}
        {discount > 0 && (
          <span className="absolute bottom-1.5 right-1.5 rounded-full bg-rose-500 px-1.5 py-1 text-[10px] font-bold leading-none text-white sm:text-xs">
            -{discount}%
          </span>
        )}
      </div>

      <div className={cn('flex flex-1 flex-col', compact ? 'px-2 pb-2 pt-2' : 'p-4')}>
        <h3 className={cn('font-bold leading-tight text-slate-900 line-clamp-2', compact ? 'min-h-9 text-[13px] sm:text-base' : 'text-base')}>
          {product.name}
        </h3>

        {ratingSummary && ratingSummary.total_reviews > 0 && (
          <div
            className={cn('mt-1 flex min-w-0 items-center gap-1 text-slate-600', compact ? 'text-[10px] sm:text-xs' : 'text-xs')}
            aria-label={`Rated ${ratingSummary.average_rating.toFixed(1)} out of 5 from ${ratingSummary.total_reviews} reviews`}
          >
            <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
            <span className="font-semibold">{ratingSummary.average_rating.toFixed(1)}</span>
            <span className="truncate">({ratingSummary.total_reviews})</span>
          </div>
        )}

        <div className={cn('mt-auto flex flex-wrap items-baseline gap-1', compact ? 'pt-1.5' : 'pt-3')}>
            <span className={cn('font-bold tracking-tight text-slate-900', compact ? 'text-[13px] sm:text-lg' : 'text-lg')}>
              {symbol}{product.price.toFixed(2)}
            </span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-[10px] font-medium text-slate-400 line-through sm:text-xs">
                {symbol}{product.compare_at_price.toFixed(2)}
              </span>
            )}
        </div>
      </div>
      </Link>
      {!isOutOfStock && (
        <button
          type="button"
          onClick={() => addToCart(product, 1, imageUrl || null)}
          className={cn('mx-2 mb-2 flex min-h-10 items-center justify-center rounded-lg bg-blue-50 font-bold text-blue-700 active:scale-[0.98]', compact ? 'mt-1 text-[11px] sm:text-sm' : 'mt-3 text-sm')}
          aria-label={`Add ${product.name} to cart`}
        >
          {compact ? 'Add to Cart' : <><Plus className="mr-1.5 h-4 w-4" />Add to Cart</>}
        </button>
      )}
    </div>
  );
}
