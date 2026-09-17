import { createClient } from '@/lib/supabase/server';
import type { ProductImage } from '@/types';

export async function listProductImages(tenantId: string, productId: string): Promise<ProductImage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('product_id', productId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch product images: ${error.message}`);
  return (data ?? []) as ProductImage[];
}

export async function createProductImageRecord(
  tenantId: string,
  productId: string,
  input: {
    storage_path: string;
    display_order: number;
    alt_text: string | null;
    mime_type: string;
    file_size: number;
    width: number | null;
    height: number | null;
    original_filename: string;
    is_primary?: boolean;
  }
): Promise<ProductImage> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('product_images')
    .insert({
      tenant_id: tenantId,
      product_id: productId,
      ...input,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create product image record');
  return data as ProductImage;
}

export async function updateProductImage(
  tenantId: string,
  imageId: string,
  input: { alt_text?: string | null; display_order?: number; is_primary?: boolean }
): Promise<ProductImage> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('product_images')
    .update(input)
    .eq('tenant_id', tenantId)
    .eq('id', imageId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to update product image');
  return data as ProductImage;
}

export async function deleteProductImageRecord(tenantId: string, imageId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('product_images')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', imageId);

  if (error) throw new Error(`Failed to delete product image: ${error.message}`);
}

export async function setProductImagePrimary(productId: string, imageId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_product_image_primary', {
    p_product_id: productId,
    p_image_id: imageId,
  });
  if (error) throw new Error(`Failed to set primary image: ${error.message}`);
}

export async function reorderProductImages(productId: string, imageIds: string[]): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('reorder_product_images', {
    p_product_id: productId,
    p_image_ids: imageIds,
  });
  if (error) throw new Error(`Failed to reorder images: ${error.message}`);
}