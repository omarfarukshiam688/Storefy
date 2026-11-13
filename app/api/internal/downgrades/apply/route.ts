import { NextRequest, NextResponse } from 'next/server';
import { applyScheduledDowngrades } from '@/lib/subscriptions/payments';

/**
 * Protected internal endpoint to trigger scheduled downgrade execution.
 *
 * This is NOT automatically scheduled. It is a hook for an external scheduler
 * (e.g., Vercel Cron, GitHub Actions, cloud scheduler) to invoke. The caller
 * must provide an x-internal-secret header matching the
 * INTERNAL_DOWNGRADE_SECRET environment variable.
 *
 * Service-role credentials are never exposed to the client. The RPC called
 * internally (public.apply_subscription_downgrades) is restricted to
 * service_role only.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret');
  const expected = process.env.INTERNAL_DOWNGRADE_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await applyScheduledDowngrades();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Scheduled downgrade execution error:', error);
    return NextResponse.json(
      { error: 'Downgrade execution failed' },
      { status: 500 }
    );
  }
}
