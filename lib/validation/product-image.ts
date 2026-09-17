import { z } from 'zod';

export const uploadProductImageSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  altText: z.string().max(255).optional(),
});

export const updateProductImageSchema = z.object({
  alt_text: z.string().max(255).nullable().optional(),
  is_primary: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
});

export const reorderProductImagesSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  imageIds: z.array(z.string().uuid()).min(1).max(8),
});

export type UploadProductImageInput = z.infer<typeof uploadProductImageSchema>;
export type UpdateProductImageInput = z.infer<typeof updateProductImageSchema>;
export type ReorderProductImagesInput = z.infer<typeof reorderProductImagesSchema>;