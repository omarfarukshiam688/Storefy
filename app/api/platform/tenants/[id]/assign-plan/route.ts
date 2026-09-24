import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { assignPlanToTenant } from '@/lib/platform';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const body = await req.json();
    const { planId } = body as { planId: string };

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    await assignPlanToTenant(id, planId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Assign plan error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('Super admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to assign plan' }, { status: 500 });
  }
}
