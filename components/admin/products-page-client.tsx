'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProductTable } from '@/components/admin/product-table';
import { ProductFilters } from '@/components/admin/product-filters';
import { ProductOverviewDrawer } from '@/components/admin/product-overview-drawer';
import Link from 'next/link';
import { Plus, Package, Sparkles, Tag } from 'lucide-react';
import type { Product, Category } from '@/types';

interface ProductsPageClientProps {
  initialProducts: Product[];
  initialCategories: Category[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
  imageCounts: Record<string, number>;
  primaryImages: Record<string, string | null>;
  categoryMap: Record<string, string>;
}

export function ProductsPageClient({
  initialProducts,
  initialCategories,
  initialTotal,
  initialPage,
  initialTotalPages,
  imageCounts,
  primaryImages,
  categoryMap,
}: ProductsPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const products = initialProducts;
  const categories = initialCategories;
  const total = initialTotal;
  const page = initialPage;
  const totalPages = initialTotalPages;
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = React.useState(false);
  const [categoryName, setCategoryName] = React.useState('');
  const [categoryError, setCategoryError] = React.useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = React.useState(false);

  const handleArchive = async (product: Product) => {
    if (
      !confirm(
        `Deactivate "${product.name}"? It will no longer be visible to customers.`
      )
    ) {
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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);

    const name = categoryName.trim();
    if (!name) {
      setCategoryError('Category name is required');
      return;
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 255);

    if (!slug) {
      setCategoryError('Invalid category name');
      return;
    }

    setIsSavingCategory(true);

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, description: null, display_order: 0, is_active: true }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        if (result.details) {
          const issues = result.details.issues ?? result.details;
          const message = Array.isArray(issues)
            ? issues.map((i: { message?: string }) => i.message).join(', ')
            : result.error ?? 'Failed to create category';
          setCategoryError(message);
        } else {
          setCategoryError(result.error ?? 'Failed to create category');
        }
        setIsSavingCategory(false);
        return;
      }

      toast.success('Category created');
      setCategoryName('');
      setCategoryError(null);
      setIsCreatingCategory(false);
      router.refresh();
    } catch {
      toast.error('An error occurred. Please try again.');
      setIsSavingCategory(false);
    }
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 rounded-[28px] border border-violet-200/80 bg-[linear-gradient(135deg,rgba(248,245,255,0.95),rgba(239,248,255,0.9))] p-5 shadow-[0_20px_55px_-35px_rgba(76,29,149,0.45)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">
            <Sparkles className="h-3.5 w-3.5" />
            Catalog workspace
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.06em] text-slate-900">
            Products
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {total} {total === 1 ? 'product' : 'products'} in your catalog
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-11 border-violet-200 text-violet-700 hover:bg-violet-50"
            onClick={() => setIsCreatingCategory((prev) => !prev)}
          >
            <Tag className="h-4 w-4 mr-2" />
            Create category
          </Button>
          <Button
            asChild
            className="h-11 bg-violet-600 shadow-[0_10px_24px_-12px_rgba(124,58,237,0.8)] hover:bg-violet-700"
          >
            <Link href="/dashboard/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Add product
            </Link>
          </Button>
        </div>
      </div>

      {isCreatingCategory && (
        <form
          onSubmit={handleCreateCategory}
          className="rounded-[24px] border border-violet-100 bg-white/75 p-4 shadow-[0_16px_40px_-30px_rgba(76,29,149,0.4)] sm:p-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto] gap-4 items-end">
            <div className="space-y-2.5">
              <Label htmlFor="quick-category-name" className="text-sm font-semibold">
                Category name
              </Label>
              <Input
                id="quick-category-name"
                type="text"
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value);
                  if (categoryError) setCategoryError(null);
                }}
                disabled={isSavingCategory}
                className="h-11 px-4 text-base"
                placeholder="e.g. Electronics"
              />
              {categoryError && (
                <p className="text-sm font-medium text-destructive">{categoryError}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={isSavingCategory} className="h-11 px-6">
                {isSavingCategory ? 'Saving...' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreatingCategory(false);
                  setCategoryName('');
                  setCategoryError(null);
                }}
                disabled={isSavingCategory}
                className="h-11 px-6"
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      <div className="rounded-[24px] border border-violet-100 bg-white/75 p-4 shadow-[0_16px_40px_-30px_rgba(76,29,149,0.4)] sm:p-5">
        <ProductFilters categories={categories} />
      </div>

      {/* Product Table */}
      {products.length > 0 && (
        <ProductTable
          products={products}
          categoryMap={categoryMap}
          imageCounts={imageCounts}
          primaryImages={primaryImages}
          onSelect={setSelectedProduct}
          onArchive={handleArchive}
          onRestore={handleRestore}
        />
      )}

      {/* Empty state */}
      {page === 1 && products.length === 0 && total === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 sm:p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-base font-semibold mb-1">
            {searchParams.toString()
              ? 'No products found'
              : 'Your catalog is empty'}
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

      <ProductOverviewDrawer
        product={selectedProduct}
        categoryName={
          selectedProduct?.category_id
            ? categoryMap[selectedProduct.category_id]
            : null
        }
        imageCount={
          selectedProduct ? (imageCounts[selectedProduct.id] ?? 0) : 0
        }
        primaryImage={
          selectedProduct ? primaryImages[selectedProduct.id] : null
        }
        onClose={() => setSelectedProduct(null)}
        onArchive={async (product) => {
          await handleArchive(product);
          setSelectedProduct(null);
        }}
        onRestore={async (product) => {
          await handleRestore(product);
          setSelectedProduct(null);
        }}
      />
    </div>
  );
}
