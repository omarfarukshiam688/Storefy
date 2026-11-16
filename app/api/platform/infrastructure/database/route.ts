import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { getDatabaseMonitoring } from '@/lib/infrastructure/database-monitoring';
import { getCapacityConfigs } from '@/lib/infrastructure/capacity';

export async function GET() {
  try {
    await requireSuperAdmin();
    const [db, capacity] = await Promise.all([getDatabaseMonitoring(20), getCapacityConfigs()]);
    const dbCap = capacity.find((c) => c.metricType === 'database') ?? null;
    return NextResponse.json({ ok: true, data: { ...db, capacity: dbCap } });
  } catch (error) {
    console.error('Infrastructure database error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch database monitoring data';
    const status = msg.includes('Super admin') ? 403 : msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
