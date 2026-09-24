import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { getProduct } from '@/lib/products';
import { reorderProductImages } from '@/lib/products/images';
import { reorderProductImagesSchema } from '@/lib/validation/product-image';

export async function POST(req: NextRequest) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const body = await req.json();
    const validated = reorderProductImagesSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, imageIds } = validated.data;

    // Verify product ownership
    await getProduct(context.activeTenant.id, productId);

    await reorderProductImages(productId, imageIds);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Product images reorder error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Product not found') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to reorder images' }, { status: 500 });
  }
}