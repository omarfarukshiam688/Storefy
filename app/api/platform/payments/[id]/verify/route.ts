import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const verifySchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().nullish(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const supabase = await createClient();
    const { id } = await params;

    const body = await request.json();
    const validated = verifySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { decision, reason } = validated.data;

    // Call the existing RPC with the authenticated Super Admin identity.
    // The server client carries the user's session, so the RPC executes
    // with auth.uid() = the calling Super Admin and enforces is_super_admin().
    const { data, error } = await supabase.rpc('approve_or_reject_payment', {
      p_payment_id: id,
      p_decision: decision,
      p_reason: reason ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = data as { success?: boolean; error?: string; error_code?: string; idempotent?: boolean };

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.error || 'Payment verification failed' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Payment ${decision}`,
      idempotent: result.idempotent === true,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes('Super admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}
