import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { getTenantMembersPlatform } from '@/lib/platform';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const members = await getTenantMembersPlatform(id);
    return NextResponse.json(members);
  } catch (error) {
    console.error('Tenant members error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('Super admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}
