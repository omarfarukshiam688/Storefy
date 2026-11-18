'use client';

import * as React from 'react';
import { ProductCard } from './product-card';
import type { Product, ReviewSummary } from '@/types';

interface ProductGridProps {
  products: Product[];
  imageUrls: Map<string, string | null>;
  tenantSlug: string;
  compactMobile?: boolean;
  ratingSummaries?: Map<string, ReviewSummary>;
}

export function ProductGrid({ products, imageUrls, tenantSlug, compactMobile = false, ratingSummaries }: ProductGridProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <div className={compactMobile
      ? 'grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4'
      : 'grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4'}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          imageUrl={imageUrls.get(product.id) || null}
          tenantSlug={tenantSlug}
          compact={compactMobile}
          ratingSummary={ratingSummaries?.get(product.id)}
        />
      ))}
    </div>
  );
}
