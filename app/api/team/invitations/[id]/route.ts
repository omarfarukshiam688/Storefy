import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { cancelInvitation } from '@/lib/team';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    if (context.role !== 'tenant_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    await cancelInvitation(context.activeTenant.id, id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Cancel invitation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel invitation' },
      { status: 500 }
    );
  }
}
