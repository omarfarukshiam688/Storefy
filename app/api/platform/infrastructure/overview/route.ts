import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { getInfrastructureOverview } from '@/lib/infrastructure/usage';

export async function GET() {
  try {
    await requireSuperAdmin();
    const data = await getInfrastructureOverview();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('Infrastructure overview error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch infrastructure overview';
    const status = msg.includes('Super admin') ? 403 : msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
