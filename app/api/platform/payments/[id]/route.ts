import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const supabase = await createClient();
    const { id } = await params;

    const { data: payment, error } = await supabase
      .from('payments')
      .select(
        `
        *,
        tenant:tenants(name, slug, plan_id, is_active),
        target_plan:plans(name, price_monthly, is_active)
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Fetch subscription details if linked
    let subscription = null;
    if (payment.subscription_id) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select(
          `
          *,
          plan:plans(name, price_monthly, is_active)
        `
        )
        .eq('id', payment.subscription_id)
        .maybeSingle();
      subscription = sub;
    }

    return NextResponse.json({
      payment,
      subscription,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('Super admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch payment' }, { status: 500 });
  }
}
