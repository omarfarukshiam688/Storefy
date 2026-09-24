import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantBySlug } from '@/lib/storefront';
import { getProductReviews } from '@/lib/reviews';

const querySchema = z.object({
  tenantSlug: z.string().min(1, 'tenantSlug is required'),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(25).default(10),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const validatedQuery = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));

    if (!validatedQuery.success) {
      return NextResponse.json(
        { error: 'Invalid review pagination request' },
        { status: 400 }
      );
    }

    const { tenantSlug, page, page_size: pageSize } = validatedQuery.data;
    const tenant = await getTenantBySlug(tenantSlug);

    if (!tenant) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const result = await getProductReviews(tenant.id, productId, {
      page,
      page_size: pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Product reviews pagination error:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
