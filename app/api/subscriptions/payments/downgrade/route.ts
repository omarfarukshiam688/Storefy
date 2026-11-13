import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDowngradePayment, handlePaymentError } from '@/lib/subscriptions/payments';

const downgradeRequestSchema = z.object({
  type: z.literal('downgrade'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = downgradeRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const result = await createDowngradePayment({ type: 'downgrade' });

    return NextResponse.json(
      {
        success: true,
        idempotent: result.idempotent,
        message: result.idempotent ? 'Existing downgrade payment returned' : 'Downgrade payment created',
        payment: result,
      },
      { status: result.idempotent ? 200 : 201 }
    );
  } catch (error) {
    return handlePaymentError(error);
  }
}
