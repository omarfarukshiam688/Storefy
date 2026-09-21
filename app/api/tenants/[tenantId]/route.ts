import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/auth/tenant';
import { updateTenantIdentity, isSlugAvailable } from '@/lib/tenants';
import { updateTenantSlugSchema } from '@/lib/validation/tenant';
import { handleAuthError } from '@/lib/auth/errors';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  try {
    await requireTenantAdmin(tenantId);

    const body = await req.json();
    const validated = updateTenantSlugSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const slugAvailable = await isSlugAvailable(validated.data.slug);
    if (!slugAvailable) {
      return NextResponse.json(
        { error: 'Slug is already taken. Please choose another.' },
        { status: 409 }
      );
    }

    const tenant = await updateTenantIdentity(tenantId, undefined, validated.data.slug);

    return NextResponse.json(
      {
        success: true,
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;

    console.error('Tenant slug update error:', error);

    if (
      error instanceof Error &&
      error.message?.includes('Tenant admin access required')
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to update tenant slug' },
      { status: 500 }
    );
  }
}
