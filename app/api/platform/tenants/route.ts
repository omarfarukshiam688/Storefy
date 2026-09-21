import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { getPlatformTenants } from '@/lib/platform';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(req.url);
    const filters = {
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      planId: searchParams.get('planId') ?? undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : undefined,
    };

    const result = await getPlatformTenants(filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Platform tenants error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('Super admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
  }
}
