import { createServiceClient } from '@/lib/supabase/admin';
import type { Tenant, Product, Category, ProductImage } from '@/types';

export interface StorefrontProductFilters {
  search?: string;
  category_id?: string | null;
  is_featured?: boolean;
  sort_by?: 'created_at' | 'updated_at' | 'name' | 'price';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface PaginatedStorefrontProducts {
  products: Product[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Tenant;
}

export async function getStorefrontProducts(
  tenantId: string,
  filters: StorefrontProductFilters = {}
): Promise<PaginatedStorefrontProducts> {
  const supabase = createServiceClient();
  const page = filters.page ?? 1;
  const pageSize = filters.page_size ?? 12;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(`name.ilike.${term},description.ilike.${term}`);
  }

  if (filters.category_id !== undefined) {
    if (filters.category_id === null || filters.category_id === '') {
      query = query.is('category_id', null);
    } else {
      query = query.eq('category_id', filters.category_id);
    }
  }

  if (filters.is_featured !== undefined) {
    query = query.eq('is_featured', filters.is_featured);
  }

  const sortBy = filters.sort_by ?? 'created_at';
  const sortOrder = filters.sort_order ?? 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  const products = (data ?? []) as Product[];
  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return {
    products,
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
  };
}

export async function getStorefrontProduct(
  tenantId: string,
  productSlug: string
): Promise<Product | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('slug', productSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Product;
}

export async function getFeaturedProducts(
  tenantId: string,
  limit = 8
): Promise<Product[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch featured products: ${error.message}`);
  }

  return (data ?? []) as Product[];
}

export async function getStorefrontCategories(
  tenantId: string
): Promise<Category[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return (data ?? []) as Category[];
}

export async function getStorefrontCategory(
  tenantId: string,
  categorySlug: string
): Promise<Category | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('slug', categorySlug)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Category;
}

export async function getProductImages(
  tenantId: string,
  productId: string
): Promise<ProductImage[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('product_id', productId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch product images: ${error.message}`);
  }

  return (data ?? []) as ProductImage[];
}

export { enrichProductImagesWithUrls, getPrimaryImageUrlsForProducts } from './images';
