import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/auth/tenant';
import {
  uploadStoreAssetFile,
  deleteStoreAssetFile,
  buildStoreAssetPath,
  detectImageType,
  getStoreAssetSignedUrl,
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
import { createServiceClient } from '@/lib/supabase/admin';
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

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 2 MB limit' }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const detected = detectImageType(arrayBuffer);
    if (!detected) {
      return NextResponse.json({ error: 'Unsupported image type. Allowed: PNG, WebP, JPEG, GIF' }, { status: 415 });
    }

    const imageId = crypto.randomUUID();
    const storagePath = buildStoreAssetPath(tenantId, imageId, detected.extension);
    const objectKey = `store-asset:logo:${tenantId}:${imageId}`;

    // Inspect existing asset for replacement accounting (do not delete yet)
    const existing = await getExistingStoreAsset(tenantId, 'logo');

    // Reserve quota atomically (credits existing bytes when replacing)
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

    // Upload new asset
    const uploadResult = await uploadStoreAssetFile(file, storagePath, detected.mimeType);
    if (uploadResult.error) {
      await releaseStorageReservation(tenantId, objectKey, 'upload_failed');
      return NextResponse.json({ error: `Upload failed: ${uploadResult.error.message}` }, { status: 500 });
    }

    // Persist new DB record
    try {
      await createStoreAssetRecord(tenantId, {
        storage_path: storagePath,
        asset_type: 'logo',
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

    // Finalize accounting (adds new bytes; subtracts replaced bytes if provided)
    const finalize = await finalizeStorageReservation(tenantId, objectKey, file.size);
    if (!finalize.success) {
      // Compensate: remove new record/file, keep old state untouched
      await deleteStoreAssetRecord(tenantId, storagePath).catch(() => {});
      await deleteStoreAssetFile(storagePath).catch(() => {});
      await releaseStorageReservation(tenantId, objectKey, 'finalize_failed');
      return NextResponse.json(
        { error: 'Failed to finalize storage accounting', code: finalize.error_code ?? 'FINALIZE_FAILED' },
        { status: 500 }
      );
    }

    // Remove previous asset only after new asset is safely recorded/accounted
    let replaceWarning: string | undefined;
    if (existing) {
      try {
        await removeExistingStoreAsset(tenantId, 'logo');
        // bytes already adjusted by finalize via replaces_bytes; no extra adjustment
      } catch (e) {
        replaceWarning = e instanceof Error ? e.message : 'Failed to remove previous asset';
        console.error('Logo replacement cleanup error:', replaceWarning);
      }
    }

    const supabase = createServiceClient();
    const { data: currentTenant, error: fetchError } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single();

    if (fetchError || !currentTenant) {
      return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 });
    }

    const currentSettings = (currentTenant.settings as Record<string, unknown>) || {};
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        settings: { ...currentSettings, logo_url: storagePath },
      })
      .eq('id', tenantId);

    if (updateError) {
      return NextResponse.json({ error: `Failed to update tenant: ${updateError.message}` }, { status: 500 });
    }

    const signedUrl = await getStoreAssetSignedUrl(storagePath, 3600);

    return NextResponse.json({
      success: true,
      storage_path: storagePath,
      signed_url: signedUrl,
      ...(replaceWarning ? { warning: replaceWarning } : {}),
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Logo upload error:', error);
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
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

    // Fetch existing record for size/accounting before deletion
    const existing = await getExistingStoreAsset(tenantId, 'logo');
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
      'store_asset_logo_deleted'
    );

    const supabase = createServiceClient();
    const { data: currentTenant, error: fetchError } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single();

    if (fetchError || !currentTenant) {
      return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 });
    }

    const currentSettings = (currentTenant.settings as Record<string, unknown>) || {};
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        settings: { ...currentSettings, logo_url: null },
      })
      .eq('id', tenantId);

    if (updateError) {
      return NextResponse.json({ error: `Failed to update tenant: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      storageDeleted: true,
      accountingAdjusted: usageAdj.success,
      accountingWarning: usageAdj.success ? undefined : usageAdj.error,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Logo delete error:', error);
    return NextResponse.json({ error: 'Failed to delete logo' }, { status: 500 });
  }
}
