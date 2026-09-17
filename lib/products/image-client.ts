import type { ProductImage } from '@/types';

const API_BASE = '/api/products/images';

export async function listProductImages(productId: string): Promise<ProductImage[]> {
  const res = await fetch(`${API_BASE}?productId=${productId}`);
  if (!res.ok) throw new Error('Failed to fetch images');
  const data = await res.json();
  return data.images;
}

export async function uploadProductImage(
  productId: string,
  file: File,
  altText?: string
): Promise<ProductImage> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('productId', productId);
  if (altText) formData.append('altText', altText);

  const res = await fetch(API_BASE, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }
  const data = await res.json();
  return data.image;
}

export async function updateProductImage(
  imageId: string,
  input: { alt_text?: string | null; is_primary?: boolean; display_order?: number }
): Promise<ProductImage> {
  const res = await fetch(`${API_BASE}/${imageId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Update failed' }));
    throw new Error(err.error || 'Update failed');
  }
  const data = await res.json();
  return data.image;
}

export async function deleteProductImage(imageId: string): Promise<{ success: boolean; storageDeleted: boolean }> {
  const res = await fetch(`${API_BASE}/${imageId}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Delete failed' }));
    throw new Error(err.error || 'Delete failed');
  }
  return res.json();
}

export async function reorderProductImages(productId: string, imageIds: string[]): Promise<void> {
  const res = await fetch(`${API_BASE}/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, imageIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Reorder failed' }));
    throw new Error(err.error || 'Reorder failed');
  }
}