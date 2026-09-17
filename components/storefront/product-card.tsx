'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  imageUrl?: string | null;
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

export function ProductCard({ product, imageUrl }: ProductCardProps) {
  const [imgError, setImgError] = React.useState(false);
  const showFallback = !imageUrl || imgError;

  const symbol = currencySymbols[product.currency] || product.currency;
  const isOutOfStock = product.stock_status === 'out_of_stock';
  const isPreorder = product.stock_status === 'preorder';
  const isBackorder = product.stock_status === 'backorder';

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_24px_60px_-30px_rgba(76,29,149,0.28)]"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100">
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
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onError={() => setImgError(true)}
          />
        )}
        {product.is_featured && (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full border border-violet-200 bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-violet-700 shadow-sm">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-semibold tracking-[-0.02em] text-slate-900 line-clamp-2">
          {product.name}
        </h3>

        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-[-0.03em] text-slate-900">
              {symbol}{product.price.toFixed(2)}
            </span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-xs font-medium text-slate-400 line-through">
                {symbol}{product.compare_at_price.toFixed(2)}
              </span>
            )}
          </div>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              isOutOfStock
                ? 'border border-red-200 bg-red-50 text-red-700'
                : isPreorder || isBackorder
                  ? 'border border-amber-200 bg-amber-50 text-amber-700'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
            )}
          >
            {isOutOfStock
              ? 'Out of stock'
              : isPreorder
                ? 'Pre-order'
                : isBackorder
                  ? 'Backorder'
                  : 'In stock'}
          </span>
        </div>
      </div>
    </Link>
  );
}
