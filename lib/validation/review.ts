import { z } from 'zod';

export const reviewRatingSchema = z
  .number()
  .int('Rating must be a whole number')
  .min(1, 'Rating must be at least 1')
  .max(5, 'Rating must be at most 5');

export const reviewStatusSchema = z.enum(['pending', 'approved', 'rejected', 'hidden']);

export const createReviewSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  order_number: z
    .string()
    .min(1, 'Order number is required')
    .max(100, 'Order number is too long'),
  order_item_id: z.string().uuid('Invalid order item ID').nullable().optional(),
  customer_id: z.string().uuid('Invalid customer ID').nullable().optional(),
  customer_name: z
    .string()
    .max(255, 'Customer name is too long')
    .optional(),
  customer_phone: z
    .string()
    .min(1, 'Phone number is required')
    .max(50, 'Phone number is too long'),
  rating: reviewRatingSchema,
  review_text: z
    .string()
    .min(1, 'Review text is required')
    .max(2000, 'Review text must be 2000 characters or fewer'),
});

export const updateReviewStatusSchema = z.object({
  status: reviewStatusSchema,
});

export const reviewFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'hidden', 'all']).optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'rating', 'product_name']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).optional(),
  page_size: z.number().int().min(1).max(100).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewStatusInput = z.infer<typeof updateReviewStatusSchema>;
export type ReviewFilters = z.infer<typeof reviewFiltersSchema>;
