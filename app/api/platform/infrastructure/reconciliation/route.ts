import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { createServiceClient } from '@/lib/supabase/admin';
import { runStorageReconciliation } from '@/lib/infrastructure/storage-reconciliation';

const MANUAL_RECONCILIATION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

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
    // If we cannot check the rate limit, fail closed
    return { allowed: false };
  }
  if (runs && runs.length > 0) {
    const lastStart = new Date(runs[0].started_at).getTime();
    const retryAfterMs = Math.max(0, MANUAL_RECONCILIATION_COOLDOWN_MS - (Date.now() - lastStart));
    return { allowed: false, retryAfterMs };
  }
  return { allowed: true };
}

export async function GET() {
  try {
    await requireSuperAdmin();
    const supabase = createServiceClient();
    const { data: runs, error } = await supabase
      .from('storage_reconciliation_runs')
      .select('id,trigger_source,status,scheduled_for,started_at,completed_at,total_objects_scanned,total_actual_bytes,total_internal_bytes,tenants_scanned,discrepancy_count,orphan_object_count,missing_object_count,error_code,error_message,details')
      .order('started_at', { ascending: false })
      .limit(20);
    if (error) {
      return NextResponse.json({ ok: true, data: { runs: [], available: false, note: error.message } });
    }
    return NextResponse.json({ ok: true, data: { runs: runs ?? [], available: true } });
  } catch (error) {
    console.error('Infrastructure reconciliation GET error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch reconciliation runs';
    const status = msg.includes('Super admin') ? 403 : msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();

    // Rate limit: max one manual reconciliation start per 5 minutes
    const rateLimit = await checkManualReconciliationRateLimit();
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Rate limited: manual reconciliation can only be started once every 5 minutes',
          retryAfterMs: rateLimit.retryAfterMs,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({} as { triggerSource?: string; scheduledFor?: string }));
    const triggerSource = body.triggerSource === 'scheduled' ? 'scheduled' : 'manual';
    const result = await runStorageReconciliation({ triggerSource, scheduledFor: body.scheduledFor });
    const status = result.ok ? 200 : result.errorCode === 'ALREADY_RUNNING' ? 409 : result.errorCode === 'LOCK_NOT_ACQUIRED' ? 409 : 500;
    return NextResponse.json({ ok: result.ok, data: result }, { status });
  } catch (error) {
    console.error('Infrastructure reconciliation POST error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to run reconciliation';
    const status = msg.includes('Super admin') ? 403 : msg === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
