'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ProductTable } from '@/components/admin/product-table';
import { ProductFilters } from '@/components/admin/product-filters';
import { ProductOverviewDrawer } from '@/components/admin/product-overview-drawer';
import { CategoryManager } from '@/components/admin/category-manager';
import { CompactResourceUsage } from '@/components/admin/compact-resource-usage';
import Link from 'next/link';
import { Plus, Package, Sparkles, Archive } from 'lucide-react';
import type { Product, Category } from '@/types';
import { CollapsibleSection } from '@/components/ui/collapsible-section';

type PageMode = 'active' | 'archived';

interface ProductsPageClientProps {
  initialProducts: Product[];
  initialCategories: Category[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
  initialSoldCounts: Record<string, number>;
  imageCounts: Record<string, number>;
  primaryImages: Record<string, string | null>;
  categoryMap: Record<string, string>;
  mode: PageMode;
  productUsed?: number;
  productLimit?: number;
}

export function ProductsPageClient({
  initialProducts,
  initialCategories,
  initialTotal,
  initialPage,
  initialTotalPages,
  initialSoldCounts,
  imageCounts,
  primaryImages,
  categoryMap,
  mode,
  productUsed,
  productLimit,
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
  const [deleteProductId, setDeleteProductId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const deleteProduct = products.find((p) => p.id === deleteProductId);

  const handleArchive = async (product: Product) => {
    if (
      !confirm(
        `Archive "${product.name}"? It will no longer be visible to customers or in your active products list.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: true }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error(result.error ?? 'Failed to archive product');
        return;
      }

      toast.success('Product archived');
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
        body: JSON.stringify({ is_archived: false }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error(result.error ?? 'Failed to restore product');
        return;
      }

      toast.success('Product restored');
      router.refresh();
    } catch {
      toast.error('An error occurred. Please try again.');
    }
  };

  const handleDeleteClick = (product: Product) => {
    setDeleteProductId(product.id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteProductId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/products/${deleteProductId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-confirm-delete': 'true',
        },
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error(result.error ?? 'Failed to delete product');
        return;
      }

      toast.success('Product permanently deleted');
      setDeleteProductId(null);
      router.refresh();
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const isArchived = mode === 'archived';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 rounded-[28px] border border-violet-200/80 bg-[linear-gradient(135deg,rgba(248,245,255,0.95),rgba(239,248,255,0.9))] p-5 shadow-[0_20px_55px_-35px_rgba(76,29,149,0.45)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">
            <Sparkles className="h-3.5 w-3.5" />
            Catalog workspace
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.06em] text-slate-900">
            {isArchived ? 'Archived Products' : 'Products'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {total} {total === 1 ? 'product' : 'products'} {isArchived ? 'archived' : 'in your catalog'}
          </p>
          {!isArchived && productUsed !== undefined && productLimit !== undefined && (
            <div className="mt-3">
              <CompactResourceUsage
                title="Products"
                icon={Package}
                used={productUsed}
                limit={productLimit}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isArchived && (
            <Button
              variant="outline"
              className="h-11 border-violet-200 text-violet-700 hover:bg-violet-50"
              asChild
            >
              <Link href="/dashboard/products/archived">
                <Archive className="h-4 w-4 mr-2" />
                Archived
              </Link>
            </Button>
          )}
          {!isArchived && (
            <Button
              asChild
              className="h-11 bg-violet-600 shadow-[0_10px_24px_-12px_rgba(124,58,237,0.8)] hover:bg-violet-700"
              disabled={productUsed !== undefined && productLimit !== undefined && productLimit !== -1 && productUsed >= productLimit}
            >
              <Link href="/dashboard/products/new">
                <Plus className="h-4 w-4 mr-2" />
                {productUsed !== undefined && productLimit !== undefined && productLimit !== -1 && productUsed >= productLimit
                  ? 'Limit reached'
                  : 'Add product'}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <CollapsibleSection
        title="Categories"
        description="Organize your products into categories."
      >
        <CategoryManager categories={categories} />
      </CollapsibleSection>

      <div className="rounded-[24px] border border-violet-100 bg-white/75 p-4 shadow-[0_16px_40px_-30px_rgba(76,29,149,0.4)] sm:p-5">
        <ProductFilters categories={categories} />
      </div>

      {/* Product Table */}
      {products.length > 0 && (
        <ProductTable
          products={products}
          categoryMap={categoryMap}
          soldCounts={initialSoldCounts}
          primaryImages={primaryImages}
          onSelect={setSelectedProduct}
          onArchive={isArchived ? undefined : handleArchive}
          onRestore={isArchived ? handleRestore : undefined}
          onDelete={isArchived ? handleDeleteClick : undefined}
          showArchivedStatus={isArchived}
        />
      )}

      {/* Empty state */}
      {page === 1 && products.length === 0 && total === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 sm:p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-base font-semibold mb-1">
            {isArchived ? 'No archived products' : 'Your catalog is empty'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isArchived
              ? 'Archived products will appear here.'
              : 'Add your first product to start building your store.'}
          </p>
          {!isArchived && (
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

      {deleteProductId && deleteProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 backdrop-blur-[2px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-900">Delete product permanently?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently remove <span className="font-semibold">{deleteProduct.name}</span> and all of its associated data. This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteProductId(null)}
                disabled={isDeleting}
                className="h-11"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="h-11 bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? 'Deleting...' : 'Delete permanently'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
