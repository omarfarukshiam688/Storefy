import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { getCategory, updateCategory, deleteCategory } from '@/lib/products';
import { updateCategorySchema } from '@/lib/validation/product';
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
    const category = await getCategory(context.activeTenant.id, id);
    return NextResponse.json(category);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Category fetch error:', error);
    if (error instanceof Error && error.message === 'Category not found') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
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
    const validated = updateCategorySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const category = await updateCategory(context.activeTenant.id, id, validated.data);
    return NextResponse.json(category);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Category update error:', error);
    if (error instanceof Error && error.message === 'Category not found') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const { id } = await params;
    await deleteCategory(context.activeTenant.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Category delete error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete category' }, { status: 500 });
  }
}
