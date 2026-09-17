'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Archive,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Edit3,
  ImageOff,
  Package,
  RotateCcw,
  Tag,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import type { Product } from '@/types';

interface ProductOverviewDrawerProps {
  product: Product | null;
  categoryName?: string | null;
  imageCount: number;
  primaryImage?: string | null;
  onClose: () => void;
  onArchive: (product: Product) => void;
  onRestore: (product: Product) => void;
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(price);
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateString));
}

export function ProductOverviewDrawer({
  product,
  categoryName,
  imageCount,
  primaryImage,
  onClose,
  onArchive,
  onRestore,
}: ProductOverviewDrawerProps) {
  React.useEffect(() => {
    if (!product) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} overview`}
    >
      <button
        type="button"
        aria-label="Close product overview"
        className="absolute inset-0 cursor-default bg-slate-950/25 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside className="relative flex h-full w-full max-w-[560px] flex-col border-l border-violet-200/80 bg-white shadow-[-24px_0_60px_-30px_rgba(76,29,149,0.45)] animate-slide-in-right">
        <div className="flex items-start justify-between border-b border-violet-100 bg-[linear-gradient(135deg,rgba(246,242,255,0.98),rgba(239,248,255,0.98))] px-5 py-5 sm:px-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">
              Product overview
            </p>
            <h2 className="mt-2 max-w-[390px] text-2xl font-bold tracking-[-0.05em] text-slate-900">
              {product.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge variant={product.is_active ? 'success' : 'neutral'}>
                {product.is_active ? 'Active' : 'Archived'}
              </StatusBadge>
              {product.is_featured && (
                <StatusBadge variant="brand">Featured</StatusBadge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="overflow-hidden rounded-[24px] border border-violet-100 bg-[linear-gradient(135deg,#f6f2ff,#eef8ff)] p-3">
            <div className="flex h-56 items-center justify-center overflow-hidden rounded-[18px] border border-white/80 bg-white/75">
              {primaryImage ? (
                <img
                  src={primaryImage}
                  alt={product.name}
                  className="h-full w-full object-contain p-5"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <ImageOff className="h-10 w-10" />
                  <span className="text-xs font-medium">No product image</span>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between px-1 text-xs text-slate-500">
              <span>
                {imageCount} {imageCount === 1 ? 'image' : 'images'} uploaded
              </span>
              <span className="font-semibold text-violet-700">
                {product.sku ?? 'No SKU'}
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <CircleDollarSign className="h-4 w-4 text-violet-600" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Price
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {formatPrice(product.price, product.currency)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <Package className="h-4 w-4 text-sky-600" />
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Stock
              </p>
              <p className="mt-1 text-lg font-bold capitalize text-slate-900">
                {product.stock_status.replace('_', ' ')}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Product details
              </h3>
              <Tag className="h-4 w-4 text-violet-600" />
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                <span className="text-slate-500">Category</span>
                <span className="text-right font-semibold text-slate-800">
                  {categoryName ?? 'Uncategorized'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                <span className="text-slate-500">Slug</span>
                <span className="max-w-[230px] break-all text-right font-mono text-xs text-slate-700">
                  {product.slug}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                <span className="text-slate-500">Last updated</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(product.updated_at)}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Visibility</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                  <Check className="h-3.5 w-3.5" />
                  {product.is_active ? 'Published' : 'Hidden'}
                </span>
              </div>
            </div>
          </div>

          {(product.short_description || product.description) && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <h3 className="text-sm font-bold text-slate-900">Description</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {product.description ?? product.short_description}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-violet-100 bg-white px-5 py-4 sm:px-7">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              asChild
              className="flex-1 bg-violet-600 hover:bg-violet-700"
            >
              <Link href={`/dashboard/products/${product.id}?mode=edit`}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit product
                <ChevronRight className="ml-auto h-4 w-4" />
              </Link>
            </Button>
            {product.is_active ? (
              <Button
                variant="outline"
                className="border-amber-200 text-amber-700 hover:bg-amber-50"
                onClick={() => onArchive(product)}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            ) : (
              <Button
                variant="outline"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => onRestore(product)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore
              </Button>
            )}
            <Button variant="ghost" className="sm:hidden" onClick={onClose}>
              Close
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <Clock3 className="h-3.5 w-3.5" />
            Changes are saved through the existing product workflow.
          </div>
        </div>
      </aside>
    </div>
  );
}
