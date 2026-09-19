import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { getTenantBySlug } from '@/lib/storefront';
import { checkoutRequestSchema } from '@/lib/validation/checkout';
import { upsertCustomerFromOrder } from '@/lib/customers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = checkoutRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { tenantSlug, items, customer } = validated.data;

    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const supabase = createServiceClient();

    const productIds = items.map((i) => i.productId);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price, currency, stock_status, is_active, is_archived, tenant_id')
      .in('id', productIds)
      .eq('tenant_id', tenant.id);

    if (productsError) {
      return NextResponse.json({ error: 'Failed to validate products' }, { status: 500 });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product) {
        return NextResponse.json(
          { error: 'One or more products are no longer available' },
          { status: 400 }
        );
      }

      if (!product.is_active || product.is_archived) {
        return NextResponse.json(
          { error: `${product.name} is no longer available` },
          { status: 400 }
        );
      }

      if (product.stock_status === 'out_of_stock') {
        return NextResponse.json(
          { error: `${product.name} is out of stock` },
          { status: 400 }
        );
      }
    }

    let subtotal = 0;
    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId)!;
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      return {
        tenant_id: tenant.id,
        product_id: product.id,
        product_name_snapshot: product.name,
        product_price: product.price,
        weight: 0,
        quantity: item.quantity,
        item_total: itemTotal,
      };
    });

    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderNumber = `ORD-${timestamp}-${random}`;

    const email = typeof customer.email === 'string' && customer.email.trim() !== '' ? customer.email.trim() : null;
    const notes = typeof customer.notes === 'string' && customer.notes.trim() !== '' ? customer.notes.trim() : null;
    const finalNotes = email && notes ? `${notes}\nEmail: ${email}` : email || notes || null;

    let customerId: string | null = null;
    try {
      const resolvedCustomer = await upsertCustomerFromOrder(tenant.id, {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.deliveryAddress,
        district: customer.district,
        notes: customer.notes,
      }, supabase);
      customerId = resolvedCustomer.id;
    } catch (customerError) {
      console.error('Customer resolution error:', customerError);
      return NextResponse.json({ error: 'Failed to process customer information' }, { status: 500 });
    }

    const insertPayload: Record<string, unknown> = {
      tenant_id: tenant.id,
      order_number: orderNumber,
      customer_name: customer.name.trim(),
      phone_number: customer.phone.trim(),
      district: customer.district.trim(),
      delivery_address: customer.deliveryAddress.trim(),
      subtotal,
      delivery_charge: 0,
      payment_method: 'pending',
      payment_status: 'pending',
      order_status: 'pending',
      customer_id: customerId,
      notes: finalNotes,
    };

    if (email) {
      insertPayload.customer_email = email;
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(insertPayload)
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    const orderItemsWithOrderId = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsWithOrderId);

    if (itemsError) {
      console.error('Order items creation error:', itemsError);
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
