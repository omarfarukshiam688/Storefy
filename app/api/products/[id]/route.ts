import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { getProduct, updateProduct, archiveProduct, restoreProduct, deleteProduct } from '@/lib/products';
import { updateProductSchema } from '@/lib/validation/product';
import { handleAuthError } from '@/lib/auth/errors';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const { id } = await params;
    const product = await getProduct(context.activeTenant.id, id);
    return NextResponse.json(product);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Product fetch error:', error);
    if (error instanceof Error && error.message === 'Product not found') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    if (body.is_archived === true && Object.keys(body).length === 1) {
      const product = await archiveProduct(context.activeTenant.id, id);
      return NextResponse.json(product);
    }

    if (body.is_archived === false && Object.keys(body).length === 1) {
      const product = await restoreProduct(context.activeTenant.id, id);
      return NextResponse.json(product);
    }

    const validated = updateProductSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const product = await updateProduct(context.activeTenant.id, id, validated.data);
    return NextResponse.json(product);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Product update error:', error);
    if (error instanceof Error && (error.message === 'Product not found')) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const { id } = await params;

    const confirmed = req.headers.get('x-confirm-delete') === 'true';
    if (!confirmed) {
      return NextResponse.json({ error: 'Delete confirmation required' }, { status: 400 });
    }

    await deleteProduct(context.activeTenant.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Product delete error:', error);
    if (error instanceof Error && error.message === 'Product not found') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete product' }, { status: 500 });
  }
}
