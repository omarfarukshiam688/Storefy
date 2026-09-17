import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { getProduct } from '@/lib/products';
import { updateProductImage, deleteProductImageRecord, setProductImagePrimary } from '@/lib/products/images';
import { deleteProductImageFile, getProductImagesSignedUrls } from '@/lib/storage';
import { updateProductImageSchema } from '@/lib/validation/product-image';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const { imageId } = await params;
    const body = await req.json();
    const validated = updateProductImageSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    // Verify the image belongs to the tenant (via product_images table)
    // We'll fetch the image first to get its product_id and verify ownership
    const supabase = await import('@/lib/supabase/server').then(m => m.createClient());
    const { data: image, error: imageError } = await supabase
      .from('product_images')
      .select('product_id')
      .eq('tenant_id', context.activeTenant.id)
      .eq('id', imageId)
      .maybeSingle();

    if (imageError || !image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Verify product ownership
    await getProduct(context.activeTenant.id, image.product_id);

    const { alt_text, is_primary, display_order } = validated.data;

    if (is_primary === true) {
      await setProductImagePrimary(image.product_id, imageId);
    }

    const updateInput: { alt_text?: string | null; display_order?: number } = {};
    if (alt_text !== undefined) updateInput.alt_text = alt_text;
    if (display_order !== undefined) updateInput.display_order = display_order;

    let updatedImage;
    if (Object.keys(updateInput).length > 0) {
      updatedImage = await updateProductImage(context.activeTenant.id, imageId, updateInput);
    } else {
      // If only is_primary was set, we still need to return the updated image
      const { data } = await supabase
        .from('product_images')
        .select('*')
        .eq('tenant_id', context.activeTenant.id)
        .eq('id', imageId)
        .single();
      updatedImage = data;
    }

    // Return with signed URL
    const imagesWithUrls = await getProductImagesSignedUrls([updatedImage], 3600, { width: 800, quality: 80 });
    return NextResponse.json({ image: imagesWithUrls[0] });
  } catch (error) {
    console.error('Product image update error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Product not found') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update image' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const { imageId } = await params;

    // Fetch image to get storage_path and product_id
    const supabase = await import('@/lib/supabase/server').then(m => m.createClient());
    const { data: image, error: imageError } = await supabase
      .from('product_images')
      .select('storage_path, product_id')
      .eq('tenant_id', context.activeTenant.id)
      .eq('id', imageId)
      .maybeSingle();

    if (imageError || !image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Verify product ownership
    await getProduct(context.activeTenant.id, image.product_id);

    // Delete storage object first
    const storageDelete = await deleteProductImageFile(image.storage_path);
    if (storageDelete.error) {
      // Storage deletion failed; do not delete database record, report explicitly
      return NextResponse.json(
        { error: 'Storage deletion failed', storageDeleted: false, details: storageDelete.error.message },
        { status: 500 }
      );
    }

    // Delete database record
    await deleteProductImageRecord(context.activeTenant.id, imageId);

    return NextResponse.json({ success: true, storageDeleted: true });
  } catch (error) {
    console.error('Product image delete error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Product not found') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete image' }, { status: 500 });
  }
}