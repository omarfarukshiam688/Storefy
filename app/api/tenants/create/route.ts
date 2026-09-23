import { NextRequest, NextResponse } from 'next/server';
import { createTenantSchema } from '@/lib/validation/tenant';
import { createTenantForUser, isSlugAvailable } from '@/lib/tenants';
import { getAuthUser } from '@/lib/auth/session';
import { sendPlatformTelegram } from '@/lib/notifications/telegram';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();

    // Parse request body
    const body = await req.json();
    const validated = createTenantSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    // Check if slug is available
    const slugAvailable = await isSlugAvailable(validated.data.slug);
    if (!slugAvailable) {
      return NextResponse.json(
        { error: 'Slug is already taken. Please choose another.' },
        { status: 409 }
      );
    }

    // Create the tenant
    const tenant = await createTenantForUser(
      user.id,
      validated.data.name,
      validated.data.slug,
      validated.data.plan_id
    );

    sendPlatformTelegram({
      type: 'tenant.created',
      data: {
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        ownerEmail: user.email,
        timestamp: new Date().toISOString(),
      },
    }).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Tenant creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    );
  }
}
