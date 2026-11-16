import { NextRequest, NextResponse } from 'next/server';
import { runStorageReconciliation } from '@/lib/infrastructure/storage-reconciliation';
import { recordDatabaseSnapshot } from '@/lib/infrastructure/database-monitoring';
import { createServiceClient } from '@/lib/supabase/admin';

const MANUAL_RECONCILIATION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const SCHEDULED_FOR_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function authorized(req: NextRequest): boolean {
  const expected = process.env.INFRA_RECONCILIATION_SECRET;
  if (!expected) return false;
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token.length > 0 && token === expected;
}

async function checkManualReconciliationRateLimit(): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - MANUAL_RECONCILIATION_COOLDOWN_MS).toISOString();
  const { data: runs, error } = await supabase
    .from('storage_reconciliation_runs')
    .select('id,status,started_at')
    .gte('started_at', cutoff)
    .order('started_at', { ascending: false })
    .limit(1);
  if (error) {
    return { allowed: false };
  }
  if (runs && runs.length > 0) {
    const lastStart = new Date(runs[0].started_at).getTime();
    const retryAfterMs = Math.max(0, MANUAL_RECONCILIATION_COOLDOWN_MS - (Date.now() - lastStart));
    return { allowed: false, retryAfterMs };
  }
  return { allowed: true };
}

function validateScheduledFor(value: unknown): string | null {
  if (typeof value !== 'string' || !SCHEDULED_FOR_REGEX.test(value)) return null;
  const d = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return null;
  // Verify round-trip: the date portion must match
  const isoDate = d.toISOString().slice(0, 10);
  if (isoDate !== value) return null;
  return value;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Missing secret is handled above (returns 401). If env var is not set,
  // all requests are rejected.

  try {
    const body = await req.json().catch(() => ({} as { scheduledFor?: string }));
    const scheduledFor = body.scheduledFor != null ? validateScheduledFor(body.scheduledFor) : null;
    if (body.scheduledFor != null && scheduledFor === null) {
      return NextResponse.json(
        { ok: false, error: 'Invalid scheduledFor format. Expected YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    // Rate limit applies to scheduled triggers too (they are expensive full-storage scans)
    const rateLimit = await checkManualReconciliationRateLimit();
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Rate limited: reconciliation can only be started once every 5 minutes',
          retryAfterMs: rateLimit.retryAfterMs,
        },
        { status: 429 }
      );
    }

    const recon = await runStorageReconciliation({ triggerSource: 'scheduled', scheduledFor: scheduledFor ?? undefined });
    let dbSnapshot: { ok: boolean; error?: string } = { ok: false, error: 'skipped' };
    try {
      await recordDatabaseSnapshot();
      dbSnapshot = { ok: true };
    } catch (e) {
      dbSnapshot = { ok: false, error: e instanceof Error ? e.message : 'Database snapshot failed' };
    }
    const ok = recon.ok;
    return NextResponse.json({ ok, data: { reconciliation: recon, databaseSnapshot: dbSnapshot } }, { status: ok ? 200 : 500 });
  } catch (error) {
    console.error('Scheduled infrastructure reconciliation error:', error);
    const msg = error instanceof Error ? error.message : 'Scheduled reconciliation failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
