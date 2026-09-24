import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { getCustomer, updateCustomer, getCustomerOrders, getCustomerStats } from '@/lib/customers';
import { z } from 'zod';

const updateCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long').optional(),
  phone: z.string().min(1, 'Phone is required').max(50, 'Phone is too long').optional(),
  email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  district: z.string().max(255).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
});

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
    const customer = await getCustomer(context.activeTenant.id, id);

    const [stats, ordersResult] = await Promise.all([
      getCustomerStats(context.activeTenant.id, id),
      getCustomerOrders(context.activeTenant.id, id, { page: 1, page_size: 10 }),
    ]);

    return NextResponse.json({ customer, stats, orders: ordersResult.orders });
  } catch (error) {
    console.error('Customer detail error:', error);
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
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
    const validated = updateCustomerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { id } = await params;
    const updates = validated.data;

    const customer = await updateCustomer(context.activeTenant.id, id, updates);
    return NextResponse.json(customer);
  } catch (error) {
    console.error('Customer update error:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 400 });
  }
}
