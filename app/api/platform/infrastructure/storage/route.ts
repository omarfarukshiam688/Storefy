import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { getTenantStorageUsageTable, getInfrastructureOverview } from '@/lib/infrastructure/usage';

export async function GET() {
  try {
    await requireSuperAdmin();
    const [overview, tenants] = await Promise.all([
      getInfrastructureOverview(),
      getTenantStorageUsageTable(),
    ]);
    return NextResponse.json({
      ok: true,
      data: {
        storage: overview.storage,
        tenants,
        generatedAt: overview.generatedAt,
      },
    });
  } catch (error) {
    console.error('Infrastructure storage error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch storage monitoring data';
    const status = msg.includes('Super admin') ? 403 : msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
