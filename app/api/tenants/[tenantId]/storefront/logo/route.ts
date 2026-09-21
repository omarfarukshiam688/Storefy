import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/auth/tenant';
import { uploadStoreAssetFile, deleteStoreAssetFile, buildStoreAssetPath, detectImageType, getStoreAssetSignedUrl, assertStorageQuota, createStoreAssetRecord, deleteStoreAssetRecord, replaceStoreAssetIfExists, sanitizeOriginalFilename } from '@/lib/storage';
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

    await replaceStoreAssetIfExists(tenantId, 'logo');

    await assertStorageQuota(tenantId, file.size);

    const uploadResult = await uploadStoreAssetFile(file, storagePath, detected.mimeType);
    if (uploadResult.error) {
      return NextResponse.json({ error: `Upload failed: ${uploadResult.error.message}` }, { status: 500 });
    }

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
      return NextResponse.json(
        { error: recordError instanceof Error ? recordError.message : 'Failed to save asset metadata' },
        { status: 500 }
      );
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

    const { error: deleteError } = await deleteStoreAssetFile(imagePath);
    if (deleteError) {
      console.error('Storage delete error:', deleteError);
    }

    await deleteStoreAssetRecord(tenantId, imagePath);

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

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Logo delete error:', error);
    return NextResponse.json({ error: 'Failed to delete logo' }, { status: 500 });
  }
}
