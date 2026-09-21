import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { reactivateTenant } from '@/lib/platform';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    await reactivateTenant(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reactivate tenant error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('Super admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reactivate tenant' },
      { status: 500 }
    );
  }
}
