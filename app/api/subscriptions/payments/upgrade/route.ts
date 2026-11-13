import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createUpgradePayment, handlePaymentError } from '@/lib/subscriptions/payments';

const upgradeRequestSchema = z.object({
  type: z.literal('upgrade'),
  targetPlanId: z.string().uuid('Invalid target plan ID'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = upgradeRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const result = await createUpgradePayment(validated.data);

    return NextResponse.json(
      {
        success: true,
        idempotent: result.idempotent,
        message: result.idempotent ? 'Existing upgrade payment returned' : 'Upgrade payment created',
        payment: result,
      },
      { status: result.idempotent ? 200 : 201 }
    );
  } catch (error) {
    return handlePaymentError(error);
  }
}
