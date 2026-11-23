import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { listBlogArticles, updateBlogArticle, deleteBlogArticle } from '@/lib/resource-center';
import { updateBlogArticleSchema } from '@/lib/validation/resource-center';
import { handleAuthError } from '@/lib/auth/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    const articles = await listBlogArticles(undefined, true);
    const article = articles.find((a) => a.id === id);

    if (!article) {
      return NextResponse.json({ error: 'Blog article not found' }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to fetch blog article:', error);
    return NextResponse.json({ error: 'Failed to fetch blog article' }, { status: 500 });
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
    const validated = updateBlogArticleSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const article = await updateBlogArticle(id, validated.data);
    return NextResponse.json(article);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to update blog article:', error);
    return NextResponse.json({ error: 'Failed to update blog article' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    await deleteBlogArticle(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to delete blog article:', error);
    return NextResponse.json({ error: 'Failed to delete blog article' }, { status: 500 });
  }
}