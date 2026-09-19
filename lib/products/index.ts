import { createClient } from '@/lib/supabase/server';
import type { Product, Category, ProductImage } from '@/types';
import type { CreateProductInput, UpdateProductInput, CreateCategoryInput, UpdateCategoryInput } from '@/lib/validation/product';
import { deleteProductImageFile } from '@/lib/storage';
import { listProductImages } from './images';

export interface ProductFilters {
  search?: string;
  category_id?: string | null;
  is_active?: boolean;
  is_featured?: boolean;
  is_archived?: boolean;
  sort_by?: 'created_at' | 'updated_at' | 'name' | 'price';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  sold_counts: Record<string, number>;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255);
}

async function assertCategoryOwnedByTenant(tenantId: string, categoryId: string | null | undefined): Promise<void> {
  if (!categoryId) {
    return;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('id', categoryId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Invalid category selected');
  }
}

export async function listProducts(tenantId: string, filters: ProductFilters = {}): Promise<PaginatedProducts> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.page_size ?? 15;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(`name.ilike.${term},slug.ilike.${term},sku.ilike.${term}`);
  }

  if (filters.category_id !== undefined) {
    if (filters.category_id === null || filters.category_id === '') {
      query = query.is('category_id', null);
    } else {
      query = query.eq('category_id', filters.category_id);
    }
  }

  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  if (filters.is_featured !== undefined) {
    query = query.eq('is_featured', filters.is_featured);
  }

  if (filters.is_archived !== undefined) {
    query = query.eq('is_archived', filters.is_archived);
  } else {
    query = query.eq('is_archived', false);
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

  const sold_counts: Record<string, number> = {};

  if (products.length > 0) {
    const productIds = products.map((p) => p.id);
    const { data: soldData, error: soldError } = await supabase
      .from('order_items')
      .select('product_id, order_id')
      .eq('tenant_id', tenantId)
      .in('product_id', productIds)
      .not('order_id', 'is', null);

    if (!soldError && soldData) {
      const counts = new Map<string, Set<string>>();
      soldData.forEach((item) => {
        if (item.product_id) {
          const set = counts.get(item.product_id) || new Set<string>();
          set.add(item.order_id);
          counts.set(item.product_id, set);
        }
      });
      counts.forEach((orderIds, productId) => {
        sold_counts[productId] = orderIds.size;
      });
    }
  }

  return {
    products,
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
    sold_counts,
  };
}

export async function getProduct(tenantId: string, productId: string): Promise<Product> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', productId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Product not found');
  }

  return data as Product;
}

export async function createProduct(tenantId: string, input: CreateProductInput): Promise<Product> {
  const supabase = await createClient();
  await assertCategoryOwnedByTenant(tenantId, input.category_id);

  const payload = {
    ...input,
    tenant_id: tenantId,
    slug: input.slug || generateSlug(input.name),
  };

  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create product');
  }

  return data as Product;
}

export async function updateProduct(tenantId: string, productId: string, input: UpdateProductInput): Promise<Product> {
  const supabase = await createClient();
  if (input.category_id !== undefined) {
    await assertCategoryOwnedByTenant(tenantId, input.category_id);
  }

  const { data, error } = await supabase
    .from('products')
    .update(input)
    .eq('tenant_id', tenantId)
    .eq('id', productId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update product');
  }

  return data as Product;
}

export async function archiveProduct(tenantId: string, productId: string): Promise<Product> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .update({ is_active: false, is_archived: true })
    .eq('tenant_id', tenantId)
    .eq('id', productId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to archive product');
  }

  return data as Product;
}

export async function restoreProduct(tenantId: string, productId: string): Promise<Product> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .update({ is_active: true, is_archived: false })
    .eq('tenant_id', tenantId)
    .eq('id', productId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to restore product');
  }

  return data as Product;
}

export async function deleteProduct(tenantId: string, productId: string): Promise<void> {
  const supabase = await createClient();

  const images = await listProductImages(tenantId, productId);
  for (const image of images) {
    const { error: storageError } = await deleteProductImageFile(image.storage_path);
    if (storageError) {
      throw new Error(`Failed to delete product image file: ${storageError.message}`);
    }
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', productId);

  if (error) {
    throw new Error(`Failed to delete product: ${error.message}`);
  }
}

export async function listArchivedProducts(tenantId: string, filters: Omit<ProductFilters, 'is_archived'> = {}): Promise<PaginatedProducts> {
  return listProducts(tenantId, { ...filters, is_archived: true });
}

export async function listCategories(tenantId: string): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return (data ?? []) as Category[];
}

export async function getCategory(tenantId: string, categoryId: string): Promise<Category> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', categoryId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Category not found');
  }

  return data as Category;
}

export async function createCategory(tenantId: string, input: CreateCategoryInput): Promise<Category> {
  const supabase = await createClient();
  const payload = {
    ...input,
    tenant_id: tenantId,
    slug: input.slug || generateSlug(input.name),
  };

  const { data, error } = await supabase
    .from('categories')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create category');
  }

  return data as Category;
}

export async function updateCategory(tenantId: string, categoryId: string, input: UpdateCategoryInput): Promise<Category> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .update(input)
    .eq('tenant_id', tenantId)
    .eq('id', categoryId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update category');
  }

  return data as Category;
}

export async function deleteCategory(tenantId: string, categoryId: string): Promise<void> {
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('category_id', categoryId);

  if (countError) {
    throw new Error(`Failed to check category usage: ${countError.message}`);
  }

  if ((count ?? 0) > 0) {
    throw new Error('Cannot delete category because it still has products. Move or remove those products first.');
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', categoryId);

  if (error) {
    throw new Error(`Failed to delete category: ${error.message}`);
  }
}

export type { ProductImage };
