import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { AuthError } from '@/lib/auth/errors';
import type { Payment } from '@/types';

const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z
    .enum(['pending', 'processing', 'completed', 'failed', 'refunded', 'verification_required', 'all'])
    .default('all'),
  purpose: z
    .enum([
      'subscription_initial',
      'subscription_renewal',
      'subscription_upgrade',
      'subscription_downgrade',
      'manual_topup',
      'refund',
      'all',
    ])
    .default('all'),
});

export async function GET(req: NextRequest) {
  let context;
  try {
    context = await getTenantContext();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!context.activeTenant) {
    return NextResponse.json({ error: 'No active tenant context' }, { status: 400 });
  }

  if (context.role !== 'tenant_admin') {
    return NextResponse.json(
      { error: 'Tenant admin access required' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const parsed = listPaymentsQuerySchema.parse({
    page: searchParams.get('page'),
    pageSize: searchParams.get('pageSize'),
    status: searchParams.get('status'),
    purpose: searchParams.get('purpose'),
  });

  const page = Math.max(parsed.page, 1);
  const pageSize = Math.min(Math.max(parsed.pageSize, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();

  let query = supabase
    .from('payments')
    .select('*', { count: 'exact' })
    .eq('tenant_id', context.activeTenant.id)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (parsed.status !== 'all') {
    query = query.eq('status', parsed.status);
  }
  if (parsed.purpose !== 'all') {
    query = query.eq('purpose', parsed.purpose);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }

  const payments = (data ?? []) as Payment[];

  return NextResponse.json({
    payments,
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  });
}
