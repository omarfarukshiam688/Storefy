import { z } from 'zod';

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']);

export const paymentStatusSchema = z.enum(['pending', 'paid', 'failed', 'refunded']);

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
});

export const updatePaymentStatusSchema = z.object({
  payment_status: paymentStatusSchema,
});

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
