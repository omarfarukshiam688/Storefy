'use server';

import { createServiceClient } from '@/lib/supabase/admin';
import { getProductImageSignedUrl, getStoreAssetSignedUrl } from '@/lib/storage';
import type { ProductImage } from '@/types';

export async function getProductImageUrl(
  storagePath: string,
  expiresIn = 3600,
  transform?: { width?: number; height?: number; quality?: number }
): Promise<string | null> {
  return getProductImageSignedUrl(storagePath, expiresIn, transform);
}

export async function getStoreLogoUrl(
  logoPath: string | null | undefined,
  expiresIn = 3600
): Promise<string | null> {
  if (!logoPath) return null;
  return getStoreAssetSignedUrl(logoPath, expiresIn);
}

export async function getHeroImageSignedUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<string | null> {
  if (!storagePath) return null;
  return getStoreAssetSignedUrl(storagePath, expiresIn);
}

export async function enrichProductImagesWithUrls(
  images: ProductImage[],
  expiresIn = 3600,
  transform?: { width?: number; height?: number; quality?: number }
): Promise<ProductImage[]> {
  const promises = images.map(async (img) => {
    const url = await getProductImageUrl(img.storage_path, expiresIn, transform);
    return { ...img, url: url ?? null } as ProductImage;
  });
  return Promise.all(promises);
}

export async function getPrimaryImageUrlsForProducts(
  tenantId: string,
  productIds: string[],
  expiresIn = 3600
): Promise<Map<string, string | null>> {
  if (productIds.length === 0) {
    return new Map();
  }

  const supabase = createServiceClient();
  const { data: images, error } = await supabase
    .from('product_images')
    .select('product_id, storage_path, is_primary')
    .in('product_id', productIds)
    .eq('tenant_id', tenantId)
    .order('display_order', { ascending: true });

  if (error || !images) {
    return new Map();
  }

  const primaryImages = images.filter((img) => img.is_primary);
  const result = new Map<string, string | null>();

  const urlPromises = primaryImages.map(async (img) => {
    const url = await getProductImageUrl(img.storage_path, expiresIn);
    return { productId: img.product_id, url };
  });

  const urlResults = await Promise.all(urlPromises);
  urlResults.forEach(({ productId, url }) => {
    result.set(productId, url);
  });

  return result;
}
