import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { listProducts, createProduct } from '@/lib/products';
import { createProductSchema } from '@/lib/validation/product';
import { handleAuthError } from '@/lib/auth/errors';

export async function GET(req: NextRequest) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filters = {
      search: searchParams.get('search') ?? undefined,
      category_id: searchParams.get('category_id') ?? undefined,
      is_active: searchParams.get('is_active') ? searchParams.get('is_active') === 'true' : undefined,
      is_featured: searchParams.get('is_featured') ? searchParams.get('is_featured') === 'true' : undefined,
      sort_by: searchParams.get('sort_by') as 'created_at' | 'updated_at' | 'name' | 'price' | undefined,
      sort_order: searchParams.get('sort_order') as 'asc' | 'desc' | undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      page_size: searchParams.get('page_size') ? parseInt(searchParams.get('page_size')!) : undefined,
    };

    const result = await listProducts(context.activeTenant.id, filters);
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Products list error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const body = await req.json();
    const validated = createProductSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const product = await createProduct(context.activeTenant.id, validated.data);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Product creation error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
