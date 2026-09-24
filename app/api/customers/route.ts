import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { listCustomers } from '@/lib/customers';

export async function GET(req: NextRequest) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const filters = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') as 'active' | 'inactive' | 'blocked' | 'all' | undefined,
      sort_by: searchParams.get('sort_by') as 'created_at' | 'updated_at' | 'name' | 'phone' | undefined,
      sort_order: searchParams.get('sort_order') as 'asc' | 'desc' | undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      page_size: searchParams.get('page_size') ? parseInt(searchParams.get('page_size')!) : undefined,
    };

    const result = await listCustomers(context.activeTenant.id, filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Customers list error:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
