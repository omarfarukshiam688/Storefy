import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/auth/tenant';
import {
  uploadStoreAssetFile,
  deleteStoreAssetFile,
  detectImageType,
  buildStorefrontHeroImagePath,
  getHeroImageSignedUrl,
  createStoreAssetRecord,
  deleteStoreAssetRecord,
  sanitizeOriginalFilename,
  getExistingStoreAsset,
  removeExistingStoreAsset,
  reserveStorageQuota,
  finalizeStorageReservation,
  releaseStorageReservation,
  adjustTenantInternalStorageUsage,
} from '@/lib/storage';
import { updateStorefrontSection } from '@/lib/storefront/config';
import { handleAuthError } from '@/lib/auth/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    await requireTenantAdmin(tenantId);

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 5 MB limit' }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const detected = detectImageType(arrayBuffer);
    if (!detected) {
      return NextResponse.json({ error: 'Unsupported image type. Allowed: JPEG, PNG, WebP, GIF' }, { status: 415 });
    }

    const imageId = crypto.randomUUID();
    const storagePath = buildStorefrontHeroImagePath(tenantId, imageId, detected.extension);
    const objectKey = `store-asset:hero:${tenantId}:${imageId}`;

    const existing = await getExistingStoreAsset(tenantId, 'hero');

    const reservation = await reserveStorageQuota({
      tenantId,
      bucketId: 'store-assets',
      storagePath,
      objectKey,
      bytes: file.size,
      source: existing ? 'replace' : 'upload',
      replacesStoragePath: existing?.storage_path ?? null,
      replacesBytes: existing?.file_size ?? null,
    });
    if (!reservation.success) {
      const status = reservation.error_code === 'QUOTA_EXCEEDED' ? 413 : 503;
      return NextResponse.json(
        { error: reservation.error ?? 'Storage quota reservation failed', code: reservation.error_code ?? 'RESERVATION_FAILED' },
        { status }
      );
    }

    const uploadResult = await uploadStoreAssetFile(file, storagePath, detected.mimeType);
    if (uploadResult.error) {
      await releaseStorageReservation(tenantId, objectKey, 'upload_failed');
      return NextResponse.json({ error: `Upload failed: ${uploadResult.error.message}` }, { status: 500 });
    }

    try {
      await createStoreAssetRecord(tenantId, {
        storage_path: storagePath,
        asset_type: 'hero',
        file_size: file.size,
        mime_type: detected.mimeType,
        original_filename: sanitizeOriginalFilename(file.name),
      });
    } catch (recordError) {
      await deleteStoreAssetFile(storagePath);
      await releaseStorageReservation(tenantId, objectKey, 'record_create_failed');
      return NextResponse.json(
        { error: recordError instanceof Error ? recordError.message : 'Failed to save asset metadata' },
        { status: 500 }
      );
    }

    const finalize = await finalizeStorageReservation(tenantId, objectKey, file.size);
    if (!finalize.success) {
      await deleteStoreAssetRecord(tenantId, storagePath).catch(() => {});
      await deleteStoreAssetFile(storagePath).catch(() => {});
      await releaseStorageReservation(tenantId, objectKey, 'finalize_failed');
      return NextResponse.json(
        { error: 'Failed to finalize storage accounting', code: finalize.error_code ?? 'FINALIZE_FAILED' },
        { status: 500 }
      );
    }

    let replaceWarning: string | undefined;
    if (existing) {
      try {
        await removeExistingStoreAsset(tenantId, 'hero');
      } catch (e) {
        replaceWarning = e instanceof Error ? e.message : 'Failed to remove previous asset';
        console.error('Hero replacement cleanup error:', replaceWarning);
      }
    }

    const section = await updateStorefrontSection(tenantId, 'hero', {
      config: { image_path: storagePath },
    });

    const signedUrl = await getHeroImageSignedUrl(storagePath, 3600);

    return NextResponse.json({
      success: true,
      image_path: storagePath,
      signed_url: signedUrl,
      section,
      ...(replaceWarning ? { warning: replaceWarning } : {}),
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Hero image upload error:', error);
    return NextResponse.json({ error: 'Failed to upload hero image' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    await requireTenantAdmin(tenantId);

    const { searchParams } = new URL(req.url);
    const imagePath = searchParams.get('image_path');

    if (!imagePath) {
      return NextResponse.json({ error: 'image_path is required' }, { status: 400 });
    }

    const existing = await getExistingStoreAsset(tenantId, 'hero');
    if (!existing || existing.storage_path !== imagePath) {
      return NextResponse.json({ error: 'Store asset not found' }, { status: 404 });
    }

    const { error: deleteError } = await deleteStoreAssetFile(imagePath);
    if (deleteError) {
      return NextResponse.json(
        { error: 'Storage deletion failed', storageDeleted: false, details: deleteError.message },
        { status: 500 }
      );
    }

    await deleteStoreAssetRecord(tenantId, imagePath);

    const usageAdj = await adjustTenantInternalStorageUsage(
      tenantId,
      -Math.max(0, existing.file_size || 0),
      'store_asset_hero_deleted'
    );

    const section = await updateStorefrontSection(tenantId, 'hero', {
      config: { image_path: null },
    });

    return NextResponse.json({
      success: true,
      section,
      storageDeleted: true,
      accountingAdjusted: usageAdj.success,
      accountingWarning: usageAdj.success ? undefined : usageAdj.error,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Hero image delete error:', error);
    return NextResponse.json({ error: 'Failed to delete hero image' }, { status: 500 });
  }
}
