import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { getDocumentationArticle, updateDocumentationArticle, deleteDocumentationArticle } from '@/lib/resource-center';
import { updateDocumentationArticleSchema } from '@/lib/validation/resource-center';
import { handleAuthError } from '@/lib/auth/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    const article = await getDocumentationArticle(id);

    return NextResponse.json(article);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to fetch documentation article:', error);
    return NextResponse.json({ error: 'Documentation article not found' }, { status: 404 });
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
    const validated = updateDocumentationArticleSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const article = await updateDocumentationArticle(id, validated.data);
    return NextResponse.json(article);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to update documentation article:', error);
    return NextResponse.json({ error: 'Failed to update documentation article' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    await deleteDocumentationArticle(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to delete documentation article:', error);
    return NextResponse.json({ error: 'Failed to delete documentation article' }, { status: 500 });
  }
}