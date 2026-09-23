import { z } from 'zod';

export const checkoutCustomerSchema = z.object({
  name: z
    .string()
    .min(1, 'Full name is required')
    .max(255, 'Name is too long'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .max(11, 'Phone number must be 11 digits (01XXXXXXXXX).')
    .regex(/^01\d{9}$/, 'Phone number must be 11 digits (01XXXXXXXXX).'),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  district: z
    .string()
    .min(1, 'District is required')
    .max(255, 'District is too long'),
  deliveryAddress: z
    .string()
    .min(1, 'Delivery address is required')
    .max(500, 'Delivery address is too long'),
  notes: z
    .string()
    .max(1000, 'Notes are too long')
    .optional()
    .or(z.literal('')),
});

export const checkoutItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(99, 'Quantity cannot exceed 99'),
});

export const checkoutRequestSchema = z.object({
  tenantSlug: z.string().min(1, 'Store is required'),
  items: z.array(checkoutItemSchema).min(1, 'Your cart is empty'),
  customer: checkoutCustomerSchema,
});

export type CheckoutCustomerInput = z.infer<typeof checkoutCustomerSchema>;
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
