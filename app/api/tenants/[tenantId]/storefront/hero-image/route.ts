import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/auth/tenant';
import { uploadStoreAssetFile, deleteStoreAssetFile, detectImageType, buildStorefrontHeroImagePath, getHeroImageSignedUrl } from '@/lib/storage';
import { updateStorefrontSection } from '@/lib/storefront/config';

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

    const uploadResult = await uploadStoreAssetFile(file, storagePath, detected.mimeType);
    if (uploadResult.error) {
      return NextResponse.json({ error: `Upload failed: ${uploadResult.error.message}` }, { status: 500 });
    }

    // Update hero section config with new image path
    const section = await updateStorefrontSection(tenantId, 'hero', {
      config: { image_path: storagePath },
    });

    const signedUrl = await getHeroImageSignedUrl(storagePath, 3600);

    return NextResponse.json({
      success: true,
      image_path: storagePath,
      signed_url: signedUrl,
      section,
    });
  } catch (error) {
    console.error('Hero image upload error:', error);
    if (error instanceof Error && error.message === 'Tenant admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
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

    // Delete from storage
    const { error: deleteError } = await deleteStoreAssetFile(imagePath);
    if (deleteError) {
      console.error('Storage delete error:', deleteError);
    }

    // Clear hero image path
    const section = await updateStorefrontSection(tenantId, 'hero', {
      config: { image_path: null },
    });

    return NextResponse.json({ success: true, section });
  } catch (error) {
    console.error('Hero image delete error:', error);
    if (error instanceof Error && error.message === 'Tenant admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete hero image' }, { status: 500 });
  }
}
