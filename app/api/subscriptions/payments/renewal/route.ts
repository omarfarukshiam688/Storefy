import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createRenewalPayment,
  createRenewalPaymentForSuspendedTenant,
  handlePaymentError,
} from '@/lib/subscriptions/payments';

const renewalRequestSchema = z.object({
  type: z.literal('renewal'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = renewalRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    let result;
    try {
      result = await createRenewalPayment();
    } catch {
      // If the normal path fails because the tenant is suspended
      // (tenant.is_active === false), fall back to the suspended-tenant
      // renewal path which uses getBillingTenantContext() instead of
      // assertTenantActive().
      result = await createRenewalPaymentForSuspendedTenant();
    }

    return NextResponse.json(
      {
        success: true,
        idempotent: result.idempotent,
        message: result.idempotent ? 'Existing renewal payment returned' : 'Renewal payment created',
        payment: result,
      },
      { status: result.idempotent ? 200 : 201 }
    );
  } catch (error) {
    return handlePaymentError(error);
  }
}
