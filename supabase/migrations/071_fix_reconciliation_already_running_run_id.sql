-- Migration 071: Fix incorrect run_id returned by start_storage_reconciliation_run on ALREADY_RUNNING
-- Corrective migration applied AFTER migrations 060, 061, 062, 063, 064, 065, 066, 067, 068, 069, and 070.
--
-- Problem: In migration 063, the ALREADY_RUNNING branch of start_storage_reconciliation_run
-- selected lock_token into v_lock_owner (text) and then returned it as run_id, which is
-- supposed to be the reconciliation run's UUID from storage_reconciliation_runs.id.
-- Callers received a lock token instead of the actual run UUID, causing downstream failures
-- when passing run_id to renew_storage_reconciliation_lease or complete_storage_reconciliation_run.
--
-- Correction:
--   1. Add v_existing_run_id uuid variable.
--   2. Select id, lock_token, lease_expires_at into correctly typed variables.
--   3. Return v_existing_run_id (the id column) as run_id in the ALREADY_RUNNING response.
--   4. Reassert EXECUTE permissions: service_role only.
--
-- Source only; NOT executed against live database.

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
  v_existing_run_id uuid;
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
  select id, lock_token, lease_expires_at into v_existing_run_id, v_lock_owner, v_lock_expires
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
      'run_id', v_existing_run_id,
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

-- Reassert explicit privilege restrictions on the function
revoke execute on function public.start_storage_reconciliation_run(text, date) from public;
revoke execute on function public.start_storage_reconciliation_run(text, date) from anon;
revoke execute on function public.start_storage_reconciliation_run(text, date) from authenticated;
grant execute on function public.start_storage_reconciliation_run(text, date) to service_role;

-- End of migration 071 (source only, not applied)
