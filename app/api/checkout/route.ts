import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { getTenantBySlug } from '@/lib/storefront';
import { checkoutRequestSchema } from '@/lib/validation/checkout';
import { upsertCustomerFromOrder } from '@/lib/customers';
import { sendNotification } from '@/lib/notifications';
import { checkRateLimit, recordRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const checkoutLimit = await checkRateLimit(`checkout:${ip}`, 'checkout', null, 5, 3600);
    if (!checkoutLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many checkout attempts. Please try again later.' },
        { status: 429 }
      );
    }

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

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('order_limit')
      .eq('id', tenant.plan_id)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Failed to resolve plan' }, { status: 500 });
    }

    if (plan.order_limit !== -1) {
      const { count, error: countError } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id);

      if (countError) {
        return NextResponse.json({ error: 'Failed to check order limit' }, { status: 500 });
      }

      if ((count ?? 0) >= plan.order_limit) {
        return NextResponse.json(
          {
            error: `Order limit reached: your current plan allows up to ${plan.order_limit} orders.`,
          },
          { status: 403 }
        );
      }
    }

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

    if (order.customer_email) {
      sendNotification({
        type: 'order.created',
        tenantId: tenant.id,
        recipientEmail: order.customer_email,
        data: {
          orderNumber: order.order_number,
          customerName: order.customer_name,
          items: orderItems.map((item) => ({
            productName: item.product_name_snapshot,
            quantity: item.quantity,
            itemTotal: Number(item.item_total),
          })),
          subtotal: Number(subtotal),
          deliveryCharge: Number(order.delivery_charge),
          total: Number(subtotal) + Number(order.delivery_charge),
          district: order.district,
          deliveryAddress: order.delivery_address,
          phoneNumber: order.phone_number,
          storeName: tenant.name,
        },
      }).catch(() => {});
    }

    await recordRateLimit(`checkout:${ip}`, 'checkout', null);

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
