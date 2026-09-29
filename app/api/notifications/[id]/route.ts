import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { createClient } from '@/lib/supabase/server';
import { handleAuthError } from '@/lib/auth/errors';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('recipient_user_id', context.profile.id)
      .or(`tenant_id.eq.${context.activeTenant.id},tenant_id.is.null`);

    if (error) {
      throw new Error(`Failed to delete notification: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Notification delete error:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
