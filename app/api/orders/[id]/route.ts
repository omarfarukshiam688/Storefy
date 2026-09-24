import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { getOrder, updateOrderStatus, updatePaymentStatus, cancelOrder } from '@/lib/orders';
import { updateOrderStatusSchema, updatePaymentStatusSchema } from '@/lib/validation/order';
import { z } from 'zod';
import { handleAuthError } from '@/lib/auth/errors';

const cancelSchema = z.object({ action: z.literal('cancel') });

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const { id } = await params;
    const order = await getOrder(context.activeTenant.id, id);
    return NextResponse.json(order);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Order detail error:', error);
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const body = await req.json();
    const { id } = await params;

    if (body.action === 'cancel') {
      cancelSchema.parse(body);
      const order = await cancelOrder(context.activeTenant.id, id);
      return NextResponse.json(order);
    }

    if (body.status) {
      const validated = updateOrderStatusSchema.parse({ status: body.status });
      const order = await updateOrderStatus(context.activeTenant.id, id, validated.status);
      return NextResponse.json(order);
    }

    if (body.payment_status) {
      const validated = updatePaymentStatusSchema.parse({ payment_status: body.payment_status });
      const order = await updatePaymentStatus(context.activeTenant.id, id, validated.payment_status);
      return NextResponse.json(order);
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Order update error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 400 });
  }
}
