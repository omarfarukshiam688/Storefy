import { NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { getTenantMembers } from '@/lib/team';

export async function GET() {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    if (context.role !== 'tenant_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const members = await getTenantMembers(context.activeTenant.id);
    return NextResponse.json(members);
  } catch (error) {
    console.error('Team members error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
