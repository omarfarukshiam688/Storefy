import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/auth/tenant';
import { updateTenantSettings } from '@/lib/tenants';
import { updateTenantSettingsSchema } from '@/lib/validation/tenant';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  try {
    await requireTenantAdmin(tenantId);

    // Parse request body
    const body = await req.json();
    const validated = updateTenantSettingsSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    // Update settings
    const tenant = await updateTenantSettings(tenantId, validated.data);

    return NextResponse.json(
      {
        success: true,
        tenant,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Tenant settings update error:', error);

    if (
      error instanceof Error &&
      error.message?.includes('Tenant admin access required')
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const message = error instanceof Error ? error.message : 'Failed to update tenant settings';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
