'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  MoreVertical,
  Pencil,
  Eye,
  Archive,
  RotateCcw,
  ImageOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Product } from '@/types';

interface ProductTableProps {
  products: Product[];
  categoryMap: Record<string, string>;
  imageCounts: Record<string, number>;
  primaryImages: Record<string, string | null>;
  onSelect?: (product: Product) => void;
  onArchive?: (product: Product) => void;
  onRestore?: (product: Product) => void;
}

const statusVariantMap: Record<
  string,
  'success' | 'error' | 'info' | 'warning' | 'brand' | 'neutral'
> = {
  in_stock: 'success',
  out_of_stock: 'error',
  preorder: 'info',
  backorder: 'warning',
};

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(price);
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function ProductActions({
  product,
  onSelect,
  onArchive,
  onRestore,
}: {
  product: Product;
  onSelect?: (product: Product) => void;
  onArchive?: (product: Product) => void;
  onRestore?: (product: Product) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
        onClick={() => onSelect?.(product)}
        aria-label={`View ${product.name}`}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
        asChild
        aria-label={`Edit ${product.name}`}
      >
        <Link href={`/dashboard/products/${product.id}?mode=edit`}>
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={() => onSelect?.(product)}
            className="flex cursor-pointer items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Overview
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={`/dashboard/products/${product.id}?mode=edit`}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {product.is_active ? (
            <DropdownMenuItem
              onClick={() => onArchive?.(product)}
              className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <Archive className="h-4 w-4" />
              Deactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => onRestore?.(product)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Activate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ProductImageCell({
  product,
  primaryImages,
}: {
  product: Product;
  primaryImages: Record<string, string | null>;
}) {
  const primaryUrl = primaryImages[product.id];

  if (!primaryUrl) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted border border-border">
        <ImageOff className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={primaryUrl}
      alt={product.name}
      className="w-10 h-10 rounded-lg object-cover border border-border bg-muted"
    />
  );
}

export function ProductTable({
  products,
  categoryMap,
  imageCounts,
  primaryImages,
  onSelect,
  onArchive,
  onRestore,
}: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
        <p className="text-sm text-muted-foreground">No products found</p>
        <p className="text-xs text-muted-foreground mt-1">
          Try adjusting your filters or search.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {products.map((product) => {
          const statusVariant =
            statusVariantMap[product.stock_status] ?? 'neutral';
          const categoryName = product.category_id
            ? categoryMap[product.category_id]
            : null;
          const count = imageCounts[product.id] ?? 0;
          return (
            <div
              key={product.id}
              className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-4"
            >
              <div className="flex items-start gap-3">
                <ProductImageCell
                  product={product}
                  primaryImages={primaryImages}
                />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/dashboard/products/${product.id}`}
                    className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                  >
                    {product.name}
                  </Link>
                  {categoryName && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {categoryName}
                    </p>
                  )}
                  {product.short_description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {product.short_description}
                    </p>
                  )}
                  {!product.is_active && (
                    <span className="inline-block mt-1 text-xs font-medium text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </div>
                <ProductActions
                  product={product}
                  onSelect={onSelect}
                  onArchive={onArchive}
                  onRestore={onRestore}
                />
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <StatusBadge variant={statusVariant}>
                  {product.stock_status.replace('_', ' ')}
                </StatusBadge>
                {product.is_featured && (
                  <StatusBadge variant="brand">Featured</StatusBadge>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {count > 0
                    ? `${count} image${count !== 1 ? 's' : ''}`
                    : 'No images'}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {formatPrice(product.price, product.currency)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(product.updated_at)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-hidden rounded-[26px] border border-violet-100 bg-white/80 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.4)] backdrop-blur-sm sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[linear-gradient(90deg,rgba(247,243,255,0.9),rgba(240,248,255,0.8))]">
              <tr className="border-b border-violet-100">
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Product
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Category
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Price
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Status
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Images
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Updated
                </th>
                <th className="h-12 px-6 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const statusVariant =
                  statusVariantMap[product.stock_status] ?? 'neutral';
                const categoryName = product.category_id
                  ? categoryMap[product.category_id]
                  : null;
                const count = imageCounts[product.id] ?? 0;
                return (
                  <tr
                    key={product.id}
                    className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-violet-50/45"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <ProductImageCell
                          product={product}
                          primaryImages={primaryImages}
                        />
                        <div className="flex flex-col min-w-0">
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                          >
                            {product.name}
                          </Link>
                          {product.short_description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {product.short_description}
                            </p>
                          )}
                          {!product.is_active && (
                            <span className="inline-block mt-1 text-xs font-medium text-muted-foreground">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">
                        {categoryName ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {formatPrice(product.price, product.currency)}
                        </span>
                        {product.compare_at_price !== null &&
                          product.compare_at_price > product.price && (
                            <span className="text-xs text-muted-foreground line-through">
                              {formatPrice(
                                product.compare_at_price,
                                product.currency
                              )}
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge variant={statusVariant}>
                        {product.stock_status.replace('_', ' ')}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-muted-foreground">
                        {count > 0
                          ? `${count} image${count !== 1 ? 's' : ''}`
                          : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(product.updated_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ProductActions
                        product={product}
                        onSelect={onSelect}
                        onArchive={onArchive}
                        onRestore={onRestore}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
