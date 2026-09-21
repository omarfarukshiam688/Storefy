import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { listCategories, createCategory } from '@/lib/products';
import { createCategorySchema } from '@/lib/validation/product';
import { handleAuthError } from '@/lib/auth/errors';

export async function GET() {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const categories = await listCategories(context.activeTenant.id);
    return NextResponse.json(categories);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Categories list error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const body = await req.json();
    const validated = createCategorySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const category = await createCategory(context.activeTenant.id, validated.data);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Category creation error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create category' }, { status: 500 });
  }
}
