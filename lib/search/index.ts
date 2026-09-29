import { createClient } from '@/lib/supabase/server';
import type { SearchResultItem } from '@/types';

export async function searchTenant(query: string, tenantId: string): Promise<SearchResultItem[]> {
  const supabase = await createClient();
  const term = `%${query}%`;
  const results: SearchResultItem[] = [];

  const [productsRes, ordersRes, customersRes, reviewsRes, announcementsRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, sku, price, currency')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('is_archived', false)
      .or(`name.ilike.${term},sku.ilike.${term}`)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('orders')
      .select('id, order_number, customer_name, subtotal, order_status')
      .eq('tenant_id', tenantId)
      .or(`order_number.ilike.${term},customer_name.ilike.${term}`)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('customers')
      .select('id, name, email, phone')
      .eq('tenant_id', tenantId)
      .or(`name.ilike.${term},phone.ilike.${term},email.ilike.${term}`)
      .order('name', { ascending: true })
      .limit(5),

    supabase
      .from('reviews')
      .select('id, rating, review_text, product_id, customer_id')
      .eq('tenant_id', tenantId)
      .or(`review_text.ilike.${term}`)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('announcements')
      .select('id, title, content, is_published, published_at')
      .eq('is_published', true)
      .or(`title.ilike.${term},content.ilike.${term}`)
      .order('published_at', { ascending: false })
      .limit(5),
  ]);

  if (productsRes.data && productsRes.data.length > 0) {
    for (const product of productsRes.data) {
      results.push({
        id: product.id,
        type: 'product',
        title: product.name,
        description: product.sku ? `SKU: ${product.sku}` : 'Product',
        href: `/dashboard/products/${product.id}`,
        meta: `${product.currency === 'BDT' ? '৳' : '$'}${Number(product.price).toFixed(2)}`,
      });
    }
  }

  if (ordersRes.data && ordersRes.data.length > 0) {
    for (const order of ordersRes.data) {
      results.push({
        id: order.id,
        type: 'order',
        title: order.order_number,
        description: order.customer_name,
        href: `/dashboard/orders/${order.id}`,
        meta: `${order.order_status} • ৳${Number(order.subtotal).toFixed(2)}`,
      });
    }
  }

  if (customersRes.data && customersRes.data.length > 0) {
    for (const customer of customersRes.data) {
      results.push({
        id: customer.id,
        type: 'customer',
        title: customer.name,
        description: customer.phone || customer.email || 'Customer',
        href: `/dashboard/customers/${customer.id}`,
      });
    }
  }

  if (reviewsRes.data && reviewsRes.data.length > 0) {
    for (const review of reviewsRes.data) {
      const excerpt = review.review_text.length > 60 ? `${review.review_text.slice(0, 60)}...` : review.review_text;
      results.push({
        id: review.id,
        type: 'review',
        title: `Review (${review.rating}/5)`,
        description: excerpt,
        href: `/dashboard/reviews`,
      });
    }
  }

  if (announcementsRes.data && announcementsRes.data.length > 0) {
    for (const announcement of announcementsRes.data) {
      const excerpt = announcement.content.length > 60 ? `${announcement.content.slice(0, 60)}...` : announcement.content;
      results.push({
        id: announcement.id,
        type: 'announcement',
        title: announcement.title,
        description: excerpt,
        href: `/dashboard/announcements`,
      });
    }
  }

  return results;
}
