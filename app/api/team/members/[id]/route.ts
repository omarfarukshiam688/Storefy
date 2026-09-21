import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { updateMemberRole, removeMember } from '@/lib/team';
import { updateMemberRoleSchema } from '@/lib/validation/team';
import { handleAuthError } from '@/lib/auth/errors';

export async function PATCH(
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
    const body = await req.json();
    const validated = updateMemberRoleSchema.safeParse(body);

    if (!validated.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validated.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      return NextResponse.json(
        { error: 'Validation failed', details: fieldErrors },
        { status: 400 }
      );
    }

    const member = await updateMemberRole(
      context.activeTenant.id,
      id,
      validated.data.role
    );

    return NextResponse.json(member);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Update member role error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update member role' },
      { status: 500 }
    );
  }
}

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

    await removeMember(context.activeTenant.id, id, context.profile.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Remove member error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove member' },
      { status: 500 }
    );
  }
}
