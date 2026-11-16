import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { createServiceClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric'); // storage_total | database_size | database_table
    const days = Math.min(90, Math.max(1, Number(searchParams.get('days') || 30)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const supabase = createServiceClient();
    let query = supabase
      .from('infrastructure_usage_snapshots')
      .select('snapshot_date,metric_type,scope,tenant_id,object_name,value_bytes,secondary_value_bytes,source,accuracy,status,measured_at,metadata')
      .gte('snapshot_date', since)
      .order('snapshot_date', { ascending: true })
      .limit(1000);
    if (metric) query = query.eq('metric_type', metric);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ok: true, data: { snapshots: [], available: false, note: error.message } });
    }
    return NextResponse.json({ ok: true, data: { snapshots: data ?? [], available: true, days } });
  } catch (error) {
    console.error('Infrastructure history error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch history';
    const status = msg.includes('Super admin') ? 403 : msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
