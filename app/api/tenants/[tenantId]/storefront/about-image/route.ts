import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/auth/tenant';
import { uploadStoreAssetFile, deleteStoreAssetFile, detectImageType, buildStorefrontAboutImagePath, getAboutImageSignedUrl, assertStorageQuota, createStoreAssetRecord, deleteStoreAssetRecord, replaceStoreAssetIfExists, sanitizeOriginalFilename } from '@/lib/storage';
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
    const storagePath = buildStorefrontAboutImagePath(tenantId, imageId, detected.extension);

    await replaceStoreAssetIfExists(tenantId, 'about');

    await assertStorageQuota(tenantId, file.size);

    const uploadResult = await uploadStoreAssetFile(file, storagePath, detected.mimeType);
    if (uploadResult.error) {
      return NextResponse.json({ error: `Upload failed: ${uploadResult.error.message}` }, { status: 500 });
    }

    try {
      await createStoreAssetRecord(tenantId, {
        storage_path: storagePath,
        asset_type: 'about',
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

    const section = await updateStorefrontSection(tenantId, 'about_us', {
      config: { image_path: storagePath },
    });

    const signedUrl = await getAboutImageSignedUrl(storagePath, 3600);

    return NextResponse.json({
      success: true,
      image_path: storagePath,
      signed_url: signedUrl,
      section,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('About image upload error:', error);
    return NextResponse.json({ error: 'Failed to upload about image' }, { status: 500 });
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

    const section = await updateStorefrontSection(tenantId, 'about_us', {
      config: { image_path: null },
    });

    return NextResponse.json({ success: true, section });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('About image delete error:', error);
    return NextResponse.json({ error: 'Failed to delete about image' }, { status: 500 });
  }
}
