'use client';

import Link from 'next/link';
import { Eye, Pencil, Archive, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import type { Product } from '@/types';

interface ProductTableProps {
  products: Product[];
  categoryMap: Record<string, string>;
  soldCounts: Record<string, number>;
  primaryImages: Record<string, string | null>;
  onSelect?: (product: Product) => void;
  onArchive?: (product: Product) => void;
  onRestore?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  showArchivedStatus?: boolean;
}

const statusVariantMap: Record<
  string,
  'success' | 'error' | 'info' | 'warning' | 'brand' | 'neutral'
> = {
  in_stock: 'success',
  out_of_stock: 'error',
  preorder: 'success',
  backorder: 'error',
};

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(price);
}

function availabilityLabel(status: string) {
  if (status === 'in_stock' || status === 'preorder') {
    return 'Available';
  }
  if (status === 'out_of_stock' || status === 'backorder') {
    return 'Unavailable';
  }
  return status.replace('_', ' ');
}

export function ProductTable({
  products,
  categoryMap,
  soldCounts,
  primaryImages,
  onSelect,
  onArchive,
  onRestore,
  onDelete,
  showArchivedStatus = false,
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
          const sold = soldCounts[product.id] ?? 0;
          const thumbnail = primaryImages[product.id];
          return (
            <div
              key={product.id}
              className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={product.name}
                      className="h-10 w-10 shrink-0 rounded-lg object-cover border border-slate-100"
                    />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 text-[10px] font-medium">
                      No img
                    </div>
                  )}
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
                    {showArchivedStatus && (
                      <span className="inline-block mt-1 text-xs font-medium text-muted-foreground">
                        Archived
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <StatusBadge variant={statusVariant}>
                  {availabilityLabel(product.stock_status)}
                </StatusBadge>
                {product.is_featured && (
                  <StatusBadge variant="brand">Featured</StatusBadge>
                )}
                {showArchivedStatus && (
                  <StatusBadge variant="neutral">Archived</StatusBadge>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {formatPrice(product.price, product.currency)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Sold: {sold}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1">
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
                {onArchive && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                    onClick={() => onArchive(product)}
                    aria-label={`Archive ${product.name}`}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                )}
                {onRestore && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                    onClick={() => onRestore(product)}
                    aria-label={`Restore ${product.name}`}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-700"
                    onClick={() => onDelete(product)}
                    aria-label={`Delete ${product.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
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
                  Sold
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Status
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
                const sold = soldCounts[product.id] ?? 0;
                const thumbnail = primaryImages[product.id];
                return (
                  <tr
                    key={product.id}
                    className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-violet-50/45"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={product.name}
                            className="h-10 w-10 shrink-0 rounded-lg object-cover border border-slate-100"
                          />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 text-[10px] font-medium">
                            No img
                          </div>
                        )}
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
                          {showArchivedStatus && (
                            <span className="inline-block mt-1 text-xs font-medium text-muted-foreground">
                              Archived
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
                      <span className="text-sm font-medium">{sold}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge variant={statusVariant}>
                          {availabilityLabel(product.stock_status)}
                        </StatusBadge>
                        {product.is_featured && (
                          <StatusBadge variant="brand">Featured</StatusBadge>
                        )}
                        {showArchivedStatus && (
                          <StatusBadge variant="neutral">Archived</StatusBadge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
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
                        {onArchive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                            onClick={() => onArchive(product)}
                            aria-label={`Archive ${product.name}`}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        {onRestore && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                            onClick={() => onRestore(product)}
                            aria-label={`Restore ${product.name}`}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-700"
                            onClick={() => onDelete(product)}
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
