-- Infrastructure Usage Final Concurrency Fixes (additive migration after 062)
-- Migration 063. Source only; NOT executed against live database.
--
-- Fixes applied:
-- 1. Add pg_advisory_xact_lock to start_storage_reconciliation_run to prevent
--    concurrent calls from both acquiring reconciliation ownership.
--    The advisory lock is transaction-scoped (released when RPC returns) and
--    serializes only the lock-acquisition/check/insert sequence, not the actual
--    reconciliation work (which is protected by lock_token + lease).

-- =============================================================================
-- Replace start_storage_reconciliation_run with advisory-lock serialization
-- =============================================================================

create or replace function public.start_storage_reconciliation_run(
  p_trigger_source text,
  p_scheduled_for date default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_run_id uuid;
  v_existing uuid;
  v_lock_token text;
  v_lease_expires_at timestamptz;
  v_lock_owner text;
  v_lock_expires timestamptz;
begin
  if p_trigger_source not in ('scheduled','manual','api','repair') then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_TRIGGER');
  end if;

  -- Transaction-level advisory lock serializes concurrent start calls.
  -- Prevents two calls from both passing the lock check and inserting separate rows.
  perform pg_advisory_xact_lock(860060001);

  -- Scheduled-run idempotency: same date, running/succeeded/partial
  if p_scheduled_for is not null then
    select id into v_existing
    from public.storage_reconciliation_runs
    where scheduled_for = p_scheduled_for
      and status in ('running','succeeded','partial')
    limit 1;
    if found then
      return jsonb_build_object('success', true, 'idempotent', true, 'run_id', v_existing, 'status', 'already_exists');
    end if;
  end if;

  -- Check for an existing non-expired lock (any trigger source)
  select lock_token, lease_expires_at into v_lock_owner, v_lock_expires
  from public.storage_reconciliation_runs
  where lock_token is not null
    and status = 'running'
    and lease_expires_at > now()
  limit 1
  for update;

  if found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'ALREADY_RUNNING',
      'error', 'Another reconciliation run is in progress',
      'run_id', v_lock_owner,
      'lease_expires_at', v_lock_expires
    );
  end if;

  -- Recover stale/expired locks: clear lock on runs where lease expired
  update public.storage_reconciliation_runs
  set lock_token = null,
      lock_acquired_at = null,
      lease_expires_at = null,
      updated_at = now()
  where lock_token is not null
    and status = 'running'
    and lease_expires_at <= now();

  -- Generate lock token and lease
  v_lock_token := gen_random_uuid()::text;
  v_lease_expires_at := now() + interval '10 minutes';

  -- Insert the run with lock held
  insert into public.storage_reconciliation_runs (
    trigger_source, status, scheduled_for, started_at, locked,
    lock_token, lock_acquired_at, lease_expires_at
  ) values (
    p_trigger_source, 'running', p_scheduled_for, now(), true,
    v_lock_token, now(), v_lease_expires_at
  )
  returning id into v_run_id;

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'run_id', v_run_id,
    'status', 'running',
    'lock_token', v_lock_token,
    'lease_expires_at', v_lease_expires_at
  );
end;
$$;

-- End of migration 063 (source only, not applied)
