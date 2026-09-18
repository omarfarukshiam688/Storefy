'use client';

import * as React from 'react';
import { ProductCard } from './product-card';
import type { Product } from '@/types';

interface ProductGridProps {
  products: Product[];
  imageUrls: Map<string, string | null>;
  tenantSlug: string;
}

export function ProductGrid({ products, imageUrls, tenantSlug }: ProductGridProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          imageUrl={imageUrls.get(product.id) || null}
          tenantSlug={tenantSlug}
        />
      ))}
    </div>
  );
}
