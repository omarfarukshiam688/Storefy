import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { getProduct } from '@/lib/products';
import { listProductImages, createProductImageRecord, deleteProductImageRecord } from '@/lib/products/images';
import type { ProductImage } from '@/types';
import {
  uploadProductImageFile,
  detectImageType,
  sanitizeOriginalFilename,
  buildProductImagePath,
  getProductImagesSignedUrls,
  deleteProductImageFile,
  reserveStorageQuota,
  finalizeStorageReservation,
  releaseStorageReservation,
} from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    // Verify product ownership
    await getProduct(context.activeTenant.id, productId);

    const images = await listProductImages(context.activeTenant.id, productId);
    const imagesWithUrls = await getProductImagesSignedUrls(images, 3600, { width: 800, quality: 80 });

    return NextResponse.json({ images: imagesWithUrls });
  } catch (error) {
    console.error('Product images list error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Product not found') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch product images' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const productId = formData.get('productId') as string;
    const altText = formData.get('altText') as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }
    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    // Validate product ownership
    await getProduct(context.activeTenant.id, productId);

    // Validate file size
    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 5 MB limit' }, { status: 413 });
    }

    // Detect image type from actual bytes
    const arrayBuffer = await file.arrayBuffer();
    const detected = detectImageType(arrayBuffer);
    if (!detected) {
      return NextResponse.json({ error: 'Unsupported image type. Allowed: JPEG, PNG, WebP, GIF' }, { status: 415 });
    }

    // Check current image count for this product
    const images = await listProductImages(context.activeTenant.id, productId);
    if (images.length >= 8) {
      return NextResponse.json({ error: 'Maximum of 8 images per product reached' }, { status: 400 });
    }

    // Generate safe storage path
    const imageId = crypto.randomUUID();
    const storagePath = buildProductImagePath(
      context.activeTenant.id,
      productId,
      imageId,
      detected.extension
    );

    // Reserve quota atomically (prevents concurrent upload races; idempotent by object key)
    const reservation = await reserveStorageQuota({
      tenantId: context.activeTenant.id,
      bucketId: 'product-images',
      storagePath,
      objectKey: `product-image:${imageId}`,
      bytes: file.size,
      source: 'upload',
    });
    if (!reservation.success) {
      const status = reservation.error_code === 'QUOTA_EXCEEDED' ? 413 : 503;
      return NextResponse.json(
        {
          error: reservation.error ?? 'Storage quota reservation failed',
          code: reservation.error_code ?? 'RESERVATION_FAILED',
        },
        { status }
      );
    }

    // Upload to storage
    const uploadResult = await uploadProductImageFile(file, storagePath, detected.mimeType);
    if (uploadResult.error) {
      await releaseStorageReservation(context.activeTenant.id, `product-image:${imageId}`, 'upload_failed');
      return NextResponse.json({ error: `Upload failed: ${uploadResult.error.message}` }, { status: 500 });
    }

    // Create database record
    const displayOrder = images.length; // append at end
    let imageRecord: ProductImage;
    try {
      imageRecord = await createProductImageRecord(context.activeTenant.id, productId, {
        storage_path: storagePath,
        display_order: displayOrder,
        alt_text: altText,
        mime_type: detected.mimeType,
        file_size: file.size,
        width: detected.width,
        height: detected.height,
        original_filename: sanitizeOriginalFilename(file.name),
        is_primary: images.length === 0, // first image becomes primary
      });
    } catch {
      const cleanup = await deleteProductImageFile(storagePath);
      await releaseStorageReservation(context.activeTenant.id, `product-image:${imageId}`, 'record_create_failed');
      return NextResponse.json(
        {
          error: 'Failed to save image metadata',
          cleanup: cleanup.error ? 'storage_cleanup_failed' : 'storage_cleaned',
        },
        { status: 500 }
      );
    }

    // Finalize reservation (increments internal usage). If this fails, attempt compensation.
    const finalize = await finalizeStorageReservation(context.activeTenant.id, `product-image:${imageId}`, file.size);
    if (!finalize.success) {
      // Compensate to avoid orphaned accounted state mismatch
      await deleteProductImageRecord(context.activeTenant.id, imageRecord.id).catch(() => {});
      await deleteProductImageFile(storagePath).catch(() => {});
      await releaseStorageReservation(context.activeTenant.id, `product-image:${imageId}`, 'finalize_failed');
      return NextResponse.json(
        { error: 'Failed to finalize storage accounting', code: finalize.error_code ?? 'FINALIZE_FAILED' },
        { status: 500 }
      );
    }

    // Generate signed URL for response
    const signedUrl = await getProductImagesSignedUrls([imageRecord], 3600, { width: 800, quality: 80 });
    const imageWithUrl = signedUrl[0];

    return NextResponse.json({ image: imageWithUrl }, { status: 201 });
  } catch (error) {
    console.error('Product image upload error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Product not found') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message.includes('Invalid UUID')) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}