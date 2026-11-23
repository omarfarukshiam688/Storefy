import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { listBlogCategories, updateBlogCategory, deleteBlogCategory } from '@/lib/resource-center';
import { updateBlogCategorySchema } from '@/lib/validation/resource-center';
import { handleAuthError } from '@/lib/auth/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    const categories = await listBlogCategories(true);
    const category = categories.find((c) => c.id === id);

    if (!category) {
      return NextResponse.json({ error: 'Blog category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to fetch blog category:', error);
    return NextResponse.json({ error: 'Failed to fetch blog category' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    const body = await req.json();
    const validated = updateBlogCategorySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const category = await updateBlogCategory(id, validated.data);
    return NextResponse.json(category);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to update blog category:', error);
    return NextResponse.json({ error: 'Failed to update blog category' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    await deleteBlogCategory(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to delete blog category:', error);
    return NextResponse.json({ error: 'Failed to delete blog category' }, { status: 500 });
  }
}