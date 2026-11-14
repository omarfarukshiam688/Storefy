import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { classifyTenantSuspensionExpiry } from '@/lib/platform';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid tenant ID format', code: 'INVALID_TENANT_ID' },
        { status: 400 }
      );
    }

    const result = await classifyTenantSuspensionExpiry(id);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      tenant_id: result.tenant_id,
      audit_id: result.audit_id,
      previous_suspension_reason: result.previous_suspension_reason,
      new_suspension_reason: result.new_suspension_reason,
    });
  } catch (error) {
    console.error('Classify tenant expiry error:', error);

    if (error instanceof Error) {
      // Handle authentication/authorization errors from requireSuperAdmin()
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'Super admin access required') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Handle structured error codes from the service function
      if ('code' in error && typeof (error as any).code === 'string') {
        const errCode = (error as Error & { code: string }).code;
        const statusMap: Record<string, number> = {
          TENANT_NOT_FOUND: 404,
          TENANT_ACTIVE: 409,
          SUSPENSION_REASON_ALREADY_SET: 409,
          CURRENT_SUBSCRIPTION_EXISTS: 409,
          NO_ELAPSED_EXPIRED_SUBSCRIPTION: 409,
          MULTIPLE_ELAPSED_EXPIRED_SUBSCRIPTIONS: 409,
          SUBSCRIPTION_TENANT_MISMATCH: 409,
          SCHEDULED_PLAN_EXISTS: 409,
          CONCURRENT_MODIFICATION: 409,
          ADMIN_IDENTITY_MISSING: 500,
          CLASSIFICATION_ERROR: 500,
          UNAUTHORIZED: 401,
        };
        const status = statusMap[errCode] ?? 500;
        return NextResponse.json(
          { error: 'Classification failed', code: error.code },
          { status }
        );
      }
    }

    // Unknown/internal error - do not leak details
    return NextResponse.json(
      { error: 'Classification failed' },
      { status: 500 }
    );
  }
}