import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { getInfrastructureOverview } from '@/lib/infrastructure/usage';

export async function GET() {
  try {
    await requireSuperAdmin();
    const overview = await getInfrastructureOverview();
    const active = overview.alerts.filter((a) => a.isActive);
    return NextResponse.json({ ok: true, data: { alerts: overview.alerts, activeAlerts: active } });
  } catch (error) {
    console.error('Infrastructure alerts error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch alerts';
    const status = msg.includes('Super admin') ? 403 : msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
