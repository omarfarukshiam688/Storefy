import { createServiceClient } from '@/lib/supabase/admin';
import { getBytesFromStorage } from '@/lib/plans/usage';
import type { ProductImage } from '@/types';

export const PRODUCT_IMAGES_BUCKET = 'product-images';
export const STORE_ASSETS_BUCKET = 'store-assets';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGES_PER_PRODUCT = 8;
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'] as const;
export const ALLOWED_EXTENSIONS = ['jpg', 'png', 'webp', 'gif', 'svg'] as const;

export type DetectedImage = {
  mimeType: string;
  extension: string;
  width: number | null;
  height: number | null;
};

export function detectImageType(buffer: ArrayBuffer): DetectedImage | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 12) return null;

  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg', width: null, height: null };
  }

  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    if (bytes.length >= 24) {
      const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
      const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
      return { mimeType: 'image/png', extension: 'png', width, height };
    }
    return { mimeType: 'image/png', extension: 'png', width: null, height: null };
  }

  // GIF
  if (
    bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 &&
    (bytes[3] === 0x38 && bytes[4] === 0x37 && bytes[5] === 0x61 ||
     bytes[3] === 0x38 && bytes[4] === 0x39 && bytes[5] === 0x61)
  ) {
    if (bytes.length >= 10) {
      const width = bytes[6] | (bytes[7] << 8);
      const height = bytes[8] | (bytes[9] << 8);
      return { mimeType: 'image/gif', extension: 'gif', width, height };
    }
    return { mimeType: 'image/gif', extension: 'gif', width: null, height: null };
  }

  // WebP
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    // VP8X or VP8L chunk parsing is complex; skip dimensions for now
    return { mimeType: 'image/webp', extension: 'webp', width: null, height: null };
  }

  // SVG
  const textPrefix = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 128)).trim().toLowerCase();
  if (textPrefix.startsWith('<?xml') || textPrefix.startsWith('<svg')) {
    return { mimeType: 'image/svg+xml', extension: 'svg', width: null, height: null };
  }

  return null;
}

export function sanitizeOriginalFilename(filename: string): string {
  // eslint-disable-next-line no-control-regex
  const base = filename.replace(/[\\/]/g, '').replace(/[\u0000-\u001f\u007f]/g, '');
  const trimmed = base.trim().slice(0, 255);
  return trimmed || 'image';
}

export function buildProductImagePath(
  tenantId: string,
  productId: string,
  imageId: string,
  extension: string
): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId) || !uuidRegex.test(productId) || !uuidRegex.test(imageId)) {
    throw new Error('Invalid UUID');
  }
  const ext = extension.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    throw new Error('Invalid extension');
  }
  return `tenant/${tenantId}/products/${productId}/images/${imageId}.${ext}`;
}

export function buildStoreAssetPath(
  tenantId: string,
  assetId: string,
  extension: string
): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId) || !uuidRegex.test(assetId)) {
    throw new Error('Invalid UUID');
  }
  const ext = extension.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    throw new Error('Invalid extension');
  }
  return `tenant/${tenantId}/branding/${assetId}.${ext}`;
}

export function buildStoreFaviconPath(
  tenantId: string,
  assetId: string,
  extension: string
): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId) || !uuidRegex.test(assetId)) {
    throw new Error('Invalid UUID');
  }
  const ext = extension.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    throw new Error('Invalid extension');
  }
  return `tenant/${tenantId}/branding/favicon/${assetId}.${ext}`;
}

export async function getProductImageSignedUrl(
  storagePath: string,
  expiresIn = 3600,
  transform?: { width?: number; height?: number; quality?: number }
): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .createSignedUrl(storagePath, expiresIn, { transform });
  if (error) return null;
  return data.signedUrl;
}

export async function getProductImagesSignedUrls(
  images: Pick<ProductImage, 'storage_path'>[],
  expiresIn = 3600,
  transform?: { width?: number; height?: number; quality?: number }
): Promise<ProductImage[]> {
  const promises = images.map(async (img) => {
    const url = await getProductImageSignedUrl(img.storage_path, expiresIn, transform);
    return { ...img, url: url ?? null } as ProductImage;
  });
  return Promise.all(promises);
}

export async function uploadProductImageFile(
  file: File,
  storagePath: string,
  mimeType: string
): Promise<{ error: Error | null }> {
  const supabase = createServiceClient();
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: mimeType, upsert: false });
  return { error: error ? new Error(error.message) : null };
}

export async function deleteProductImageFile(storagePath: string): Promise<{ error: Error | null }> {
  const supabase = createServiceClient();
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .remove([storagePath]);
  return { error: error ? new Error(error.message) : null };
}

export async function uploadStoreAssetFile(
  file: File,
  storagePath: string,
  mimeType: string
): Promise<{ error: Error | null }> {
  const supabase = createServiceClient();
  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(STORE_ASSETS_BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: mimeType, upsert: false });
  return { error: error ? new Error(error.message) : null };
}

export async function deleteStoreAssetFile(storagePath: string): Promise<{ error: Error | null }> {
  const supabase = createServiceClient();
  const { error } = await supabase.storage
    .from(STORE_ASSETS_BUCKET)
    .remove([storagePath]);
  return { error: error ? new Error(error.message) : null };
}

export function buildStorefrontHeroImagePath(
  tenantId: string,
  imageId: string,
  extension: string
): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId) || !uuidRegex.test(imageId)) {
    throw new Error('Invalid UUID');
  }
  const ext = extension.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    throw new Error('Invalid extension');
  }
  return `tenant/${tenantId}/branding/hero/${imageId}.${ext}`;
}

export function buildStorefrontAboutImagePath(
  tenantId: string,
  imageId: string,
  extension: string
): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId) || !uuidRegex.test(imageId)) {
    throw new Error('Invalid UUID');
  }
  const ext = extension.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    throw new Error('Invalid extension');
  }
  return `tenant/${tenantId}/branding/about/${imageId}.${ext}`;
}

export async function getStoreAssetSignedUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(STORE_ASSETS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

export async function getHeroImageSignedUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<string | null> {
  return getStoreAssetSignedUrl(storagePath, expiresIn);
}

export async function assertStorageQuota(tenantId: string, incomingFileSize: number): Promise<void> {
  const supabase = createServiceClient();

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('plan_id')
    .eq('id', tenantId)
    .single();

  if (tenantError || !tenant) {
    throw new Error(tenantError?.message ?? 'Tenant not found');
  }

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('storage_limit_bytes')
    .eq('id', tenant.plan_id)
    .single();

  if (planError || !plan) {
    throw new Error(planError?.message ?? 'Plan not found');
  }

  if (plan.storage_limit_bytes === -1) {
    return;
  }

  const [productImageRows, storeAssetRows] = await Promise.all([
    supabase
      .from('product_images')
      .select('storage_path')
      .eq('tenant_id', tenantId),
    supabase
      .from('store_assets')
      .select('storage_path')
      .eq('tenant_id', tenantId),
  ]);

  const productImagePaths = (productImageRows.data ?? [])
    .map((row) => row.storage_path)
    .filter((path): path is string => typeof path === 'string' && path.length > 0);

  const storeAssetPaths = (storeAssetRows.data ?? [])
    .map((row) => row.storage_path)
    .filter((path): path is string => typeof path === 'string' && path.length > 0);

  const [productImageStorageBytes, storeAssetStorageBytes] = await Promise.all([
    getBytesFromStorage('product-images', productImagePaths),
    getBytesFromStorage('store-assets', storeAssetPaths),
  ]);

  const currentUsage = productImageStorageBytes + storeAssetStorageBytes;

  if (currentUsage + incomingFileSize > plan.storage_limit_bytes) {
    throw new Error(
      `Storage limit reached: your current plan allows up to ${plan.storage_limit_bytes} bytes. ` +
      `Current usage: ${currentUsage} bytes. ` +
      `File size: ${incomingFileSize} bytes.`
    );
  }
}

export async function createStoreAssetRecord(tenantId: string, input: {
  storage_path: string;
  asset_type: 'logo' | 'hero' | 'about' | 'favicon';
  file_size: number;
  mime_type: string;
  original_filename: string;
}): Promise<{ id: string }> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('store_assets')
    .insert({
      tenant_id: tenantId,
      storage_path: input.storage_path,
      asset_type: input.asset_type,
      file_size: input.file_size,
      mime_type: input.mime_type,
      original_filename: input.original_filename,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create store asset record');
  }

  return { id: data.id };
}

export async function replaceStoreAssetIfExists(
  tenantId: string,
  assetType: 'logo' | 'hero' | 'about' | 'favicon'
): Promise<{ storagePath: string | null }> {
  const supabase = createServiceClient();
  const { data: existing, error: fetchError } = await supabase
    .from('store_assets')
    .select('storage_path')
    .eq('tenant_id', tenantId)
    .eq('asset_type', assetType)
    .maybeSingle();

  if (fetchError || !existing) {
    return { storagePath: null };
  }

  await deleteStoreAssetFile(existing.storage_path);
  await deleteStoreAssetRecord(tenantId, existing.storage_path);

  return { storagePath: existing.storage_path };
}

export async function deleteStoreAssetRecord(tenantId: string, storagePath: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('store_assets')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('storage_path', storagePath);

  if (error) {
    throw new Error(`Failed to delete store asset record: ${error.message}`);
  }
}

export async function getAboutImageSignedUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<string | null> {
  return getStoreAssetSignedUrl(storagePath, expiresIn);
}
