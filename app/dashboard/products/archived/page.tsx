import { redirect } from 'next/navigation';
import { getTenantContext } from '@/lib/auth/tenant';
import { listArchivedProducts, listCategories } from '@/lib/products';
import { getProductImagesSignedUrls } from '@/lib/storage';
import { ProductsPageClient } from '@/components/admin/products-page-client';

export default async function ArchivedProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getTenantContext();

  if (!context.activeTenant) {
    redirect('/dashboard/onboarding');
  }

  const tenant = context.activeTenant;
  const resolvedParams = await searchParams;
  const [productsResult, categories] = await Promise.all([
    listArchivedProducts(tenant.id, {
      search: typeof resolvedParams.search === 'string' ? resolvedParams.search : undefined,
      category_id: typeof resolvedParams.category_id === 'string' ? resolvedParams.category_id : undefined,
      sort_by: resolvedParams.sort_by as 'created_at' | 'updated_at' | 'name' | 'price' | undefined,
      sort_order: resolvedParams.sort_order as 'asc' | 'desc' | undefined,
      page: typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : undefined,
      page_size: typeof resolvedParams.page_size === 'string' ? parseInt(resolvedParams.page_size) : undefined,
    }),
    listCategories(tenant.id),
  ]);

  const productIds = productsResult.products.map((p) => p.id);
  const supabase = await import('@/lib/supabase/server').then(m => m.createClient());

  const imageCounts: Record<string, number> = {};
  const primaryImages: Record<string, string | null> = {};

  if (productIds.length > 0) {
    const { data: images } = await supabase
      .from('product_images')
      .select('product_id, storage_path, is_primary')
      .eq('tenant_id', tenant.id)
      .in('product_id', productIds);

    const imagesWithUrls = await getProductImagesSignedUrls(
      (images ?? []) as Pick<import('@/types').ProductImage, 'storage_path'>[],
      3600,
      { width: 800, quality: 80 }
    );

    imagesWithUrls.forEach((img) => {
      imageCounts[img.product_id] = (imageCounts[img.product_id] || 0) + 1;
      if (img.is_primary && primaryImages[img.product_id] == null) {
        primaryImages[img.product_id] = img.url;
      }
    });
  }

  const categoryMap = categories.reduce<Record<string, string>>((acc, cat) => {
    acc[cat.id] = cat.name;
    return acc;
  }, {});

  return (
    <ProductsPageClient
      initialProducts={productsResult.products}
      initialCategories={categories}
      initialTotal={productsResult.total}
      initialPage={productsResult.page}
      initialTotalPages={productsResult.total_pages}
      initialSoldCounts={productsResult.sold_counts}
      imageCounts={imageCounts}
      primaryImages={primaryImages}
      categoryMap={categoryMap}
      mode="archived"
    />
  );
}
