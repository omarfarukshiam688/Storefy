import { createServiceClient } from '@/lib/supabase/admin';
import { detectImageType } from '@/lib/storage';

export const RESOURCE_CENTER_BUCKET = 'resource-center-assets';
export const MAX_RC_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_RC_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export const ALLOWED_RC_EXTENSIONS = ['jpg', 'png', 'webp', 'avif'] as const;

export type ResourceCenterAssetType =
  | 'documentation/cover'
  | 'blog/videos/thumbnail'
  | 'blog/articles/cover'
  | 'changelog/release';

export type RCUploadResult = {
  success: boolean;
  storagePath?: string;
  publicUrl?: string;
  fileSize?: number;
  mimeType?: string;
  error?: string;
};

export function buildResourceCenterPath(
  assetType: ResourceCenterAssetType,
  contentId: string,
  extension: string
): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(contentId)) {
    throw new Error('Invalid content ID');
  }
  const ext = extension.toLowerCase();
  if (!ALLOWED_RC_EXTENSIONS.includes(ext as (typeof ALLOWED_RC_EXTENSIONS)[number])) {
    throw new Error('Invalid extension');
  }
  const folderMap: Record<ResourceCenterAssetType, string> = {
    'documentation/cover': 'documentation/covers',
    'blog/videos/thumbnail': 'blog/videos/thumbnails',
    'blog/articles/cover': 'blog/articles/covers',
    'changelog/release': 'changelog/releases',
  };
  return `${folderMap[assetType]}/${contentId}.${ext}`;
}

export async function validateAndUploadRCImage(
  file: File,
  assetType: ResourceCenterAssetType,
  contentId: string
): Promise<RCUploadResult> {
  const allowedTypes = ALLOWED_RC_MIME_TYPES;

  if (!allowedTypes.includes(file.type as (typeof allowedTypes)[number])) {
    return { success: false, error: `Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP, AVIF` };
  }

  if (file.size > MAX_RC_IMAGE_BYTES) {
    return { success: false, error: `File size exceeds ${MAX_RC_IMAGE_BYTES / (1024 * 1024)} MB limit` };
  }

  const arrayBuffer = await file.arrayBuffer();
  const detected = detectImageType(arrayBuffer);

  if (!detected || !allowedTypes.includes(detected.mimeType as (typeof allowedTypes)[number])) {
    return { success: false, error: 'Invalid image file content' };
  }

  const ext = detected.extension;
  const storagePath = buildResourceCenterPath(assetType, contentId, ext);

  const supabase = createServiceClient();
  const { error: uploadError } = await supabase.storage
    .from(RESOURCE_CENTER_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: detected.mimeType,
      upsert: true,
    });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data: publicUrlData } = supabase.storage
    .from(RESOURCE_CENTER_BUCKET)
    .getPublicUrl(storagePath);

  return {
    success: true,
    storagePath,
    publicUrl: publicUrlData.publicUrl,
    fileSize: file.size,
    mimeType: detected.mimeType,
  };
}

export async function deleteRCImage(storagePath: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();
  const { error } = await supabase.storage
    .from(RESOURCE_CENTER_BUCKET)
    .remove([storagePath]);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function getRCPublicUrl(storagePath: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = supabase.storage
    .from(RESOURCE_CENTER_BUCKET)
    .getPublicUrl(storagePath);
  return data.publicUrl ?? null;
}

export async function replaceRCImage(
  file: File,
  assetType: ResourceCenterAssetType,
  contentId: string,
  oldStoragePath: string | null
): Promise<RCUploadResult> {
  const uploadResult = await validateAndUploadRCImage(file, assetType, contentId);
  if (!uploadResult.success) {
    return uploadResult;
  }

  if (oldStoragePath && oldStoragePath !== uploadResult.storagePath) {
    const deleteResult = await deleteRCImage(oldStoragePath);
    if (!deleteResult.success) {
      console.warn('Failed to delete old Resource Center image:', deleteResult.error);
    }
  }

  return uploadResult;
}