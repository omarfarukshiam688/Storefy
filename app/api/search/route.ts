import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { searchTenant } from '@/lib/search';
import { handleAuthError } from '@/lib/auth/errors';

export async function GET(req: NextRequest) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const query = req.nextUrl.searchParams.get('q')?.trim() ?? '';

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchTenant(query, context.activeTenant.id);

    return NextResponse.json({ results });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
