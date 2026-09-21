import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { getPlatformOverview } from '@/lib/platform';

export async function GET() {
  try {
    await requireSuperAdmin();
    const overview = await getPlatformOverview();
    return NextResponse.json(overview);
  } catch (error) {
    console.error('Platform overview error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('Super admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 });
  }
}
