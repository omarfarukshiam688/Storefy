import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { createClient } from '@/lib/supabase/server';
import { handleAuthError } from '@/lib/auth/errors';

export async function GET(req: NextRequest) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const supabase = await createClient();

    const page = req.nextUrl.searchParams.get('page') ? parseInt(req.nextUrl.searchParams.get('page')!) : 1;
    const pageSize = req.nextUrl.searchParams.get('page_size') ? parseInt(req.nextUrl.searchParams.get('page_size')!) : 15;
    const offset = (page - 1) * pageSize;

    const [{ data: notifications, error, count }, { count: unreadCount }] = await Promise.all([
      supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('recipient_user_id', context.profile.id)
        .or(`tenant_id.eq.${context.activeTenant.id},tenant_id.is.null`)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_user_id', context.profile.id)
        .or(`tenant_id.eq.${context.activeTenant.id},tenant_id.is.null`)
        .is('read_at', null),
    ]);

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / pageSize) || 1;

    return NextResponse.json({
      notifications: notifications ?? [],
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
      unread_count: unreadCount ?? 0,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Notifications list error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('recipient_user_id', context.profile.id)
      .or(`tenant_id.eq.${context.activeTenant.id},tenant_id.is.null`);

    if (error) {
      throw new Error(`Failed to delete notifications: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Notifications delete error:', error);
    return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 });
  }
}
