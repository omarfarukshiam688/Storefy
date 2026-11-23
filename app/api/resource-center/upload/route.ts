import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { validateAndUploadRCImage, deleteRCImage, ResourceCenterAssetType } from '@/lib/storage/resource-center';
import { handleAuthError } from '@/lib/auth/errors';

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const assetType = formData.get('asset_type') as ResourceCenterAssetType | null;
    const contentId = formData.get('content_id') as string | null;
    const oldStoragePath = formData.get('old_storage_path') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!assetType || !contentId) {
      return NextResponse.json({ error: 'asset_type and content_id are required' }, { status: 400 });
    }

    const validAssetTypes: ResourceCenterAssetType[] = [
      'documentation/cover',
      'blog/videos/thumbnail',
      'blog/articles/cover',
      'changelog/release',
    ];

    if (!validAssetTypes.includes(assetType)) {
      return NextResponse.json({ error: 'Invalid asset_type' }, { status: 400 });
    }

    let result;
    if (oldStoragePath) {
      const { replaceRCImage } = await import('@/lib/storage/resource-center');
      result = await replaceRCImage(file, assetType, contentId, oldStoragePath);
    } else {
      result = await validateAndUploadRCImage(file, assetType, contentId);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      storage_path: result.storagePath,
      public_url: result.publicUrl,
      file_size: result.fileSize,
      mime_type: result.mimeType,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Resource Center upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(req.url);
    const storagePath = searchParams.get('storage_path');

    if (!storagePath) {
      return NextResponse.json({ error: 'storage_path is required' }, { status: 400 });
    }

    const result = await deleteRCImage(storagePath);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Resource Center delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}