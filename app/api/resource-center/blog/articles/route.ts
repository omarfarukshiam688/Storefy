import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { listBlogArticles, createBlogArticle } from '@/lib/resource-center';
import { createBlogArticleSchema } from '@/lib/validation/resource-center';
import { handleAuthError } from '@/lib/auth/errors';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const categoryId = req.nextUrl.searchParams.get('category_id') ?? undefined;
    const includeUnpublished = req.nextUrl.searchParams.get('include_unpublished') === 'true';

    const articles = await listBlogArticles(categoryId, includeUnpublished);

    return NextResponse.json({ articles });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to fetch blog articles:', error);
    return NextResponse.json({ error: 'Failed to fetch blog articles' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const body = await req.json();
    const validated = createBlogArticleSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const article = await createBlogArticle(validated.data);
    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to create blog article:', error);
    return NextResponse.json({ error: 'Failed to create blog article' }, { status: 500 });
  }
}