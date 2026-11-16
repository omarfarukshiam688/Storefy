import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { getCapacityConfigs, setCapacityConfig, type CapacityMetric } from '@/lib/infrastructure/capacity';

export async function GET() {
  try {
    await requireSuperAdmin();
    const configs = await getCapacityConfigs();
    return NextResponse.json({ ok: true, data: { configs } });
  } catch (error) {
    console.error('Infrastructure capacity GET error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch capacity config';
    const status = msg.includes('Super admin') ? 403 : msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSuperAdmin();
    const body = await req.json() as {
      metricType?: CapacityMetric;
      capacityBytes?: number | null;
      sourceType?: 'unconfigured' | 'manual' | 'supabase_api' | 'supabase_dashboard';
      sourceLabel?: string | null;
      notes?: string | null;
      verified?: boolean;
    };

    if (!body.metricType || !['storage', 'database'].includes(body.metricType)) {
      return NextResponse.json({ ok: false, error: 'Invalid metricType' }, { status: 400 });
    }
    const sourceType = body.sourceType ?? 'manual';
    if (!['unconfigured', 'manual', 'supabase_api', 'supabase_dashboard'].includes(sourceType)) {
      return NextResponse.json({ ok: false, error: 'Invalid sourceType' }, { status: 400 });
    }
    if (body.capacityBytes != null && (!Number.isFinite(body.capacityBytes) || body.capacityBytes <= 0)) {
      return NextResponse.json({ ok: false, error: 'capacityBytes must be a positive number or null' }, { status: 400 });
    }

    // Manual values must not be labeled as automatically verified
    const verified = sourceType === 'manual' ? false : Boolean(body.verified);

    const result = await setCapacityConfig({
      metricType: body.metricType,
      capacityBytes: body.capacityBytes ?? null,
      sourceType,
      sourceLabel: body.sourceLabel ?? null,
      notes: body.notes ?? null,
      configuredBy: (user as { id?: string }).id ?? null,
      verified,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error ?? 'Failed to save capacity config' }, { status: 500 });
    }
    const configs = await getCapacityConfigs();
    return NextResponse.json({ ok: true, data: { configs } });
  } catch (error) {
    console.error('Infrastructure capacity POST error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to save capacity config';
    const status = msg.includes('Super admin') ? 403 : msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
