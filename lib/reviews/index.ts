import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import type { Review, ReviewSummary, ReviewStatus, ReviewFilters, PaginatedReviews } from '@/types';
import { createReviewSchema, updateReviewStatusSchema, type CreateReviewInput } from '@/lib/validation/review';
import { checkRateLimit, recordRateLimit } from '@/lib/rate-limit';

function normalizeReview(raw: Partial<Review> & { status?: string }): Review {
  const status: ReviewStatus = ['pending', 'approved', 'rejected', 'hidden'].includes(raw.status as ReviewStatus)
    ? (raw.status as ReviewStatus)
    : 'pending';

  return {
    id: raw.id ?? '',
    tenant_id: raw.tenant_id ?? '',
    product_id: raw.product_id ?? '',
    customer_id: raw.customer_id ?? null,
    order_id: raw.order_id ?? '',
    order_item_id: raw.order_item_id ?? null,
    rating: Math.min(5, Math.max(1, Number(raw.rating) || 1)),
    review_text: raw.review_text ?? '',
    status,
    created_at: raw.created_at ?? new Date().toISOString(),
    updated_at: raw.updated_at ?? new Date().toISOString(),
  };
}

export async function listReviews(tenantId: string, filters: ReviewFilters = {}): Promise<PaginatedReviews> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.page_size ?? 15;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('reviews')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(`review_text.ilike.${term}`);
  }

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const sortBy = filters.sort_by ?? 'created_at';
  const sortOrder = filters.sort_order ?? 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) {
    throw new Error(`Failed to fetch reviews: ${error.message}`);
  }

  const reviews = (data ?? []).map(normalizeReview);

  if (reviews.length > 0) {
    const customerIds = [...new Set(reviews.filter((r) => r.customer_id).map((r) => r.customer_id!))];
    const productIds = [...new Set(reviews.map((r) => r.product_id))];

    const customerMap = new Map<string, string>();
    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .in('id', customerIds);

      (customers ?? []).forEach((c) => customerMap.set(c.id, c.name));
    }

    const productMap = new Map<string, string>();
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .in('id', productIds);

      (products ?? []).forEach((p) => productMap.set(p.id, p.name));
    }

    reviews.forEach((review) => {
      review.customer_name = review.customer_id ? customerMap.get(review.customer_id) ?? null : null;
      review.product_name = productMap.get(review.product_id) ?? null;
    });
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return {
    reviews,
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
  };
}

export async function getReview(tenantId: string, reviewId: string): Promise<Review> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', reviewId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Review not found');
  }

  const normalized = normalizeReview(data);

  let customerName: string | null = null;

  if (normalized.customer_id) {
    const { data: customer } = await supabase
      .from('customers')
      .select('name')
      .eq('tenant_id', tenantId)
      .eq('id', normalized.customer_id)
      .maybeSingle();

    customerName = customer?.name ?? null;
  }

  const { data: product } = await supabase
    .from('products')
    .select('name')
    .eq('tenant_id', tenantId)
    .eq('id', normalized.product_id)
    .maybeSingle();

  return {
    ...normalized,
    customer_name: customerName,
    product_name: product?.name ?? null,
  };
}

export async function createReview(tenantId: string, input: CreateReviewInput): Promise<Review> {
  const validated = createReviewSchema.parse(input);

  const supabase = createServiceClient();

  const trimmedOrderNumber = validated.order_number.trim();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_status, customer_id, customer_name, phone_number')
    .eq('tenant_id', tenantId)
    .eq('order_number', trimmedOrderNumber)
    .single();

  if (orderError || !order) {
    throw new Error('Order not found');
  }

  if (order.order_status !== 'delivered') {
    throw new Error('Reviews can only be submitted after the order has been delivered');
  }

  const { data: orderItem, error: orderItemError } = await supabase
    .from('order_items')
    .select('id, product_id')
    .eq('tenant_id', tenantId)
    .eq('order_id', order.id)
    .eq('product_id', validated.product_id)
    .maybeSingle();

  if (orderItemError || !orderItem) {
    throw new Error('This product was not found in the specified order');
  }

  const { data: existingReview, error: existingError } = await supabase
    .from('reviews')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('order_id', order.id)
    .eq('product_id', validated.product_id)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check existing review: ${existingError.message}`);
  }

  if (existingReview) {
    throw new Error('A review for this product in this order already exists');
  }

  const rateLimitKey = `review:${tenantId}:${validated.customer_phone}`;
  const rateLimitResult = await checkRateLimit(rateLimitKey, 'review_submit', tenantId, 5, 3600);

  if (!rateLimitResult.allowed) {
    throw new Error(`Too many review submissions. Please try again in ${Math.ceil((rateLimitResult.resetAt - Date.now()) / 60000)} minutes.`);
  }

  const customerId = validated.customer_id ?? order.customer_id ?? null;

  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .insert({
      tenant_id: tenantId,
      product_id: validated.product_id,
      customer_id: customerId,
      order_id: order.id,
      order_item_id: validated.order_item_id ?? orderItem.id,
      rating: validated.rating,
      review_text: validated.review_text,
      status: 'pending',
    })
    .select()
    .single();

  if (reviewError || !review) {
    throw new Error(reviewError?.message ?? 'Failed to create review');
  }

  await recordRateLimit(rateLimitKey, 'review_submit', tenantId);

  let productName: string | null = null;
  try {
    const { data: product } = await supabase
      .from('products')
      .select('name')
      .eq('tenant_id', tenantId)
      .eq('id', validated.product_id)
      .maybeSingle();

    productName = product?.name ?? null;
  } catch {
    // ignore lookup failure for notification
  }

  try {
    const { createNotificationsForTenantMembers } = await import('@/lib/notifications/in-app');
    await createNotificationsForTenantMembers({
      tenantId,
      type: 'review.created',
      title: 'New Review Received',
      message: `New review received for ${productName ?? 'a product'}`,
      targetType: 'review',
      targetId: review.id,
      role: 'tenant_admin',
    });
  } catch {
    // notification failure should not break review creation
  }

  return normalizeReview(review);
}

export async function updateReviewStatus(
  tenantId: string,
  reviewId: string,
  status: ReviewStatus
): Promise<Review> {
  const validated = updateReviewStatusSchema.parse({ status });

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reviews')
    .update({ status: validated.status, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('id', reviewId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update review status');
  }

  return normalizeReview(data);
}

export async function deleteReview(tenantId: string, reviewId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', reviewId);

  if (error) {
    throw new Error(error?.message ?? 'Failed to delete review');
  }
}

export async function getProductRatingSummary(tenantId: string, productId: string): Promise<ReviewSummary> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('tenant_id', tenantId)
    .eq('product_id', productId)
    .eq('status', 'approved');

  if (error) {
    throw new Error(`Failed to fetch rating summary: ${error.message}`);
  }

  const reviews = data ?? [];
  const totalReviews = reviews.length;

  if (totalReviews === 0) {
    return {
      average_rating: 0,
      total_reviews: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;

  for (const review of reviews) {
    const rating = Number(review.rating);
    sum += rating;
    distribution[rating] = (distribution[rating] || 0) + 1;
  }

  return {
    average_rating: Math.round((sum / totalReviews) * 10) / 10,
    total_reviews: totalReviews,
    distribution,
  };
}

export async function getProductReviews(
  tenantId: string,
  productId: string,
  filters: { page?: number; page_size?: number } = {}
): Promise<PaginatedReviews> {
  const supabase = await createServiceClient();
  const page = filters.page ?? 1;
  const pageSize = filters.page_size ?? 10;
  const offset = (page - 1) * pageSize;

  const { data, error, count } = await supabase
    .from('reviews')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    throw new Error(`Failed to fetch product reviews: ${error.message}`);
  }

  const reviews = (data ?? []).map(normalizeReview);
  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return {
    reviews,
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
  };
}

export async function getStoreReviews(
  tenantId: string,
  limit = 5
): Promise<Review[]> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch store reviews: ${error.message}`);
  }

  return (data ?? []).map(normalizeReview);
}

export async function verifyOrderForReview(
  tenantId: string,
  orderId: string,
  productId: string,
  customerPhone: string
): Promise<{ orderId: string; orderItemId: string }> {
  const supabase = createServiceClient();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_status, phone_number')
    .eq('tenant_id', tenantId)
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw new Error('Order not found');
  }

  if (order.phone_number !== customerPhone) {
    throw new Error('Phone number does not match the order');
  }

  if (order.order_status !== 'delivered') {
    throw new Error('This order is not eligible for reviews yet');
  }

  const { data: orderItem, error: orderItemError } = await supabase
    .from('order_items')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('order_id', orderId)
    .eq('product_id', productId)
    .maybeSingle();

  if (orderItemError || !orderItem) {
    throw new Error('This product was not found in the specified order');
  }

  return { orderId: order.id, orderItemId: orderItem.id };
}
