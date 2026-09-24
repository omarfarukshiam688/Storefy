import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant';
import { getPendingInvitations, createInvitation } from '@/lib/team';
import { createInvitationSchema } from '@/lib/validation/team';
import { handleAuthError } from '@/lib/auth/errors';
import { sendNotification } from '@/lib/notifications';
import { checkRateLimit, recordRateLimit } from '@/lib/rate-limit';

export async function GET() {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    if (context.role !== 'tenant_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invitations = await getPendingInvitations(context.activeTenant.id);
    return NextResponse.json(invitations);
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Pending invitations error:', error);
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getTenantContext();
    if (!context.activeTenant) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    if (context.role !== 'tenant_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const inviteLimit = await checkRateLimit(
      `invitation:${context.activeTenant.id}:${ip}`,
      'invitation_create',
      context.activeTenant.id,
      10,
      3600
    );
    if (!inviteLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many invitation attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validated = createInvitationSchema.safeParse(body);

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

    const invitation = await createInvitation(
      context.activeTenant.id,
      validated.data.email,
      validated.data.role
    );
    await recordRateLimit(
      `invitation:${context.activeTenant.id}:${ip}`,
      'invitation_create',
      context.activeTenant.id
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const invitationLink = `${siteUrl}/invitation/accept?token=${invitation.token}`;

    sendNotification({
      type: 'tenant.invitation_created',
      tenantId: context.activeTenant.id,
      recipientEmail: invitation.email,
      data: {
        tenantName: context.activeTenant.name,
        invitedBy: context.profile.name ?? 'A team member',
        role: invitation.role,
        invitationLink,
      },
    }).catch(() => {});

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error('Create invitation error:', error);
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
  }
}
