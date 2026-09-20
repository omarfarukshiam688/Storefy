import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { getTenantBySlug } from '@/lib/storefront';
import { createReview, listReviews } from '@/lib/reviews';
import { createReviewSchema } from '@/lib/validation/review';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantSlug = body.tenantSlug as string | undefined;

    if (!tenantSlug) {
      return NextResponse.json({ error: 'tenantSlug is required' }, { status: 400 });
    }

    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const validated = createReviewSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const review = await createReview(tenant.id, validated.data);
    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Review creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create review' },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    if (context.role !== 'tenant_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const filters = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') as 'pending' | 'approved' | 'rejected' | 'hidden' | 'all' | undefined,
      sort_by: searchParams.get('sort_by') as 'created_at' | 'updated_at' | 'rating' | 'product_name' | undefined,
      sort_order: searchParams.get('sort_order') as 'asc' | 'desc' | undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      page_size: searchParams.get('page_size') ? parseInt(searchParams.get('page_size')!) : undefined,
    };

    const result = await listReviews(context.activeTenant.id, filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Reviews list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
