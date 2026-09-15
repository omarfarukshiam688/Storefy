import { z } from 'zod';

export const createProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(255, 'Product name is too long'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255, 'Slug is too long')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z
    .string()
    .nullable()
    .optional(),
  short_description: z
    .string()
    .nullable()
    .optional(),
  sku: z
    .string()
    .max(100, 'SKU is too long')
    .nullable()
    .optional(),
  price: z
    .number({ invalid_type_error: 'Price is required' })
    .min(0, 'Price must be non-negative'),
  compare_at_price: z
    .number()
    .min(0, 'Compare-at price must be non-negative')
    .nullable()
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code (e.g., USD)')
    .default('USD'),
  stock_status: z
    .enum(['in_stock', 'out_of_stock', 'preorder', 'backorder'])
    .default('in_stock'),
  is_active: z
    .boolean()
    .default(true),
  is_featured: z
    .boolean()
    .default(false),
  category_id: z
    .string()
    .uuid('Invalid category ID')
    .nullable()
    .optional(),
});

export const updateProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(255, 'Product name is too long')
    .optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255, 'Slug is too long')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  description: z
    .string()
    .nullable()
    .optional(),
  short_description: z
    .string()
    .nullable()
    .optional(),
  sku: z
    .string()
    .max(100, 'SKU is too long')
    .nullable()
    .optional(),
  price: z
    .number({ invalid_type_error: 'Price is required' })
    .min(0, 'Price must be non-negative')
    .optional(),
  compare_at_price: z
    .number()
    .min(0, 'Compare-at price must be non-negative')
    .nullable()
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code (e.g., USD)')
    .optional(),
  stock_status: z
    .enum(['in_stock', 'out_of_stock', 'preorder', 'backorder'])
    .optional(),
  is_active: z
    .boolean()
    .optional(),
  is_featured: z
    .boolean()
    .optional(),
  category_id: z
    .string()
    .uuid('Invalid category ID')
    .nullable()
    .optional(),
});

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(255, 'Category name is too long'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255, 'Slug is too long')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z
    .string()
    .nullable()
    .optional(),
  display_order: z
    .number()
    .int('Display order must be a whole number')
    .min(0, 'Display order must be non-negative')
    .optional(),
  is_active: z
    .boolean()
    .default(true),
});

export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(255, 'Category name is too long')
    .optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255, 'Slug is too long')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  description: z
    .string()
    .nullable()
    .optional(),
  display_order: z
    .number()
    .int('Display order must be a whole number')
    .min(0, 'Display order must be non-negative')
    .optional(),
  is_active: z
    .boolean()
    .optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
