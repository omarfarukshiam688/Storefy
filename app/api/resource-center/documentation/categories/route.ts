import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import {
  listDocumentationCategories,
  createDocumentationCategory,
} from '@/lib/resource-center';
import { createDocumentationCategorySchema } from '@/lib/validation/resource-center';
import { handleAuthError } from '@/lib/auth/errors';

export async function GET() {
  try {
    await requireSuperAdmin();

    const categories = await listDocumentationCategories(true);

    return NextResponse.json({ categories });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to fetch documentation categories:', error);
    return NextResponse.json({ error: 'Failed to fetch documentation categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const body = await req.json();
    const validated = createDocumentationCategorySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const category = await createDocumentationCategory(validated.data);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Failed to create documentation category:', error);
    return NextResponse.json({ error: 'Failed to create documentation category' }, { status: 500 });
  }
}