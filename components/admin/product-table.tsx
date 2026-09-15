'use client';

import * as React from 'react';
import Link from 'next/link';
import { MoreVertical, Pencil, Eye, Archive, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  onArchive?: (product: Product) => void;
  onRestore?: (product: Product) => void;
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  in_stock: { bg: 'bg-green-100', text: 'text-green-800', label: 'In stock' },
  out_of_stock: { bg: 'bg-red-100', text: 'text-red-800', label: 'Out of stock' },
  preorder: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pre-order' },
  backorder: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Backorder' },
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

export function ProductTable({ products, onArchive, onRestore }: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
        <p className="text-sm text-muted-foreground">No products found</p>
        <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or search.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="h-12 px-6 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Product
              </th>
              <th className="h-12 px-6 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                SKU
              </th>
              <th className="h-12 px-6 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Price
              </th>
              <th className="h-12 px-6 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="h-12 px-6 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Featured
              </th>
              <th className="h-12 px-6 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Updated
              </th>
              <th className="h-12 px-6 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const status = statusStyles[product.stock_status] ?? statusStyles.in_stock;
              return (
                <tr
                  key={product.id}
                  className="border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
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
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-muted-foreground">
                      {product.sku ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {formatPrice(product.price, product.currency)}
                      </span>
                      {product.compare_at_price !== null && product.compare_at_price > product.price && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(product.compare_at_price, product.currency)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {product.is_featured ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                        Featured
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(product.updated_at)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/products/${product.id}`} className="flex items-center gap-2 cursor-pointer">
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/products/${product.id}?mode=edit`} className="flex items-center gap-2 cursor-pointer">
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
