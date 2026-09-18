import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/auth/session';
import { getTenantContext } from '@/lib/auth/tenant';
import { getProduct, listCategories } from '@/lib/products';
import { listProductImages } from '@/lib/products/images';
import { getProductImagesSignedUrls } from '@/lib/storage';
import { ProductForm } from '@/components/admin/product-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, ImageOff } from 'lucide-react';

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  try {
    await requireAuthUser();
  } catch {
    redirect('/login');
  }

  let context;
  try {
    context = await getTenantContext();
  } catch {
    redirect('/dashboard/onboarding');
  }

  if (!context.activeTenant) {
    redirect('/dashboard/onboarding');
  }

  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const mode = resolvedSearchParams.mode === 'edit' ? 'edit' : 'view';

  let product;
  try {
    product = await getProduct(context.activeTenant.id, id);
  } catch {
    redirect('/dashboard/products');
  }

  const categories = await listCategories(context.activeTenant.id);

  const images = await listProductImages(context.activeTenant.id, id);
  const imagesWithUrls = await getProductImagesSignedUrls(images, 3600, { width: 800, quality: 80 });

  const primaryImage = imagesWithUrls.find((img) => img.is_primary) ?? imagesWithUrls[0] ?? null;
  const primaryImageUrl = primaryImage?.url ?? null;
  const imageCount = imagesWithUrls.length;

  if (mode === 'edit') {
    console.log('[DIAGNOSTIC] page.tsx imagesWithUrls count:', imagesWithUrls.length, imagesWithUrls.map(i => ({ id: i.id, storage_path: i.storage_path, url: i.url })));

    return (
      <div className="space-y-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link href="/dashboard/products">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Edit product</h1>
          </div>
          <p className="text-muted-foreground ml-11">
            Update product details, pricing, and inventory.
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-6 lg:p-8">
          <ProductForm mode="edit" initialData={product} initialImages={imagesWithUrls} categories={categories} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href="/dashboard/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
        </div>
        <p className="text-muted-foreground ml-11">
          {product.is_active ? 'Active' : 'Inactive'} product details.
        </p>
      </div>

      <div className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-6 lg:p-8">
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild className="h-11">
              <Link href={`/dashboard/products/${product.id}?mode=edit`}>
                Edit product
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-11">
              <Link href="/dashboard/products">
                Back to products
              </Link>
            </Button>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-violet-100 bg-[linear-gradient(135deg,#f6f2ff,#eef8ff)] p-3">
            <div className="flex h-64 items-center justify-center overflow-hidden rounded-[18px] border border-white/80 bg-white/75">
              {primaryImageUrl ? (
                <img
                  src={primaryImageUrl}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Basic information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Name</p>
                  <p className="text-sm font-medium">{product.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Slug</p>
                  <p className="text-sm font-mono text-muted-foreground">{product.slug}</p>
                </div>
                {product.short_description && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Short description</p>
                    <p className="text-sm">{product.short_description}</p>
                  </div>
                )}
                {product.description && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-semibold">Pricing</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Price</p>
                  <p className="text-sm font-medium">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(product.price)}
                  </p>
                </div>
                {product.compare_at_price !== null && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Compare-at price</p>
                    <p className="text-sm line-through text-muted-foreground">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(product.compare_at_price)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Currency</p>
                  <p className="text-sm">{product.currency}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-semibold">Inventory</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">SKU</p>
                  <p className="text-sm font-mono">{product.sku ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Stock status</p>
                  <p className="text-sm capitalize">{product.stock_status.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Featured</p>
                  <p className="text-sm">{product.is_featured ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-semibold">Organization</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Category</p>
                  <p className="text-sm">{product.category_id ? 'Assigned' : 'Uncategorized'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
