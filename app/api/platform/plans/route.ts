import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { getPlatformPlans } from '@/lib/platform';

export async function GET() {
  try {
    await requireSuperAdmin();
    const plans = await getPlatformPlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error('Platform plans error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('Super admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}
