import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { getTenantStorageUsageTable } from '@/lib/infrastructure/usage';

export async function GET() {
  try {
    await requireSuperAdmin();
    const tenants = await getTenantStorageUsageTable();
    return NextResponse.json({ ok: true, data: { tenants } });
  } catch (error) {
    console.error('Infrastructure tenants usage error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch tenant usage data';
    const status = msg.includes('Super admin') ? 403 : msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
