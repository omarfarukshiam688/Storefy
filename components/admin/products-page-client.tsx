'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ProductTable } from '@/components/admin/product-table';
import { ProductFilters } from '@/components/admin/product-filters';
import { CategoryManager } from '@/components/admin/category-manager';
import Link from 'next/link';
import { Plus, Package } from 'lucide-react';
import type { Product, Category } from '@/types';

interface ProductsPageClientProps {
  initialProducts: Product[];
  initialCategories: Category[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
}

export function ProductsPageClient({
  initialProducts,
  initialCategories,
  initialTotal,
  initialPage,
  initialTotalPages,
}: ProductsPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const products = initialProducts;
  const categories = initialCategories;
  const total = initialTotal;
  const page = initialPage;
  const totalPages = initialTotalPages;

  const handleArchive = async (product: Product) => {
    if (!confirm(`Deactivate "${product.name}"? It will no longer be visible to customers.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error(result.error ?? 'Failed to deactivate product');
        return;
      }

      toast.success('Product deactivated');
      router.refresh();
    } catch {
      toast.error('An error occurred. Please try again.');
    }
  };

  const handleRestore = async (product: Product) => {
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error(result.error ?? 'Failed to activate product');
        return;
      }

      toast.success('Product activated');
      router.refresh();
    } catch {
      toast.error('An error occurred. Please try again.');
    }
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1">
            {total} {total === 1 ? 'product' : 'products'} in your catalog
          </p>
        </div>
        <Button asChild className="h-11">
          <Link href="/dashboard/products/new">
            <Plus className="h-4 w-4 mr-2" />
            Add product
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <ProductFilters categories={categories} />

      {/* Product Table */}
      {products.length > 0 && (
        <ProductTable
          products={products}
          onArchive={handleArchive}
          onRestore={handleRestore}
        />
      )}

      {/* Empty state */}
      {page === 1 && products.length === 0 && total === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 sm:p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-base font-semibold mb-1">
            {searchParams.toString() ? 'No products found' : 'Your catalog is empty'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchParams.toString()
              ? 'Try adjusting your filters or search.'
              : 'Add your first product to start building your store.'}
          </p>
          {!searchParams.toString() && (
            <Button asChild size="sm">
              <Link href="/dashboard/products/new">
                <Plus className="h-4 w-4 mr-2" />
                Add product
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              className="h-9"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              className="h-9"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Category Manager */}
      <div className="pt-8">
        <CategoryManager categories={categories} />
      </div>
    </div>
  );
}
