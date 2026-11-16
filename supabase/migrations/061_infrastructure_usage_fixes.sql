-- Infrastructure Usage Fixes (additive migration after 060)
-- Migration 061. Source only; NOT executed against live database.
--
-- Fixes applied:
-- 1. upsert_infrastructure_alert_state now returns 'changed' flag for state transitions
-- 2. Revoke get_tenant_storage_quota_bytes from authenticated (service_role only)
-- 3. Persistent reconciliation run lock/lease on storage_reconciliation_runs
-- 4. Replace start_storage_reconciliation_run with lock-aware version
-- 5. Replace complete_storage_reconciliation_run with lock-owner verification
-- 6. Replace reserve_storage_quota: expired reservations never return idempotent success
-- 7. Replace finalize_storage_upload_reservation: require actual uploaded bytes
-- 8. Create get_database_size_bytes RPC (service_role only)
-- 9. Create get_largest_tables RPC (service_role only)

-- =============================================================================
-- Phase 1: Fix upsert_infrastructure_alert_state to return 'changed' flag
-- =============================================================================

create or replace function public.upsert_infrastructure_alert_state(
  p_alert_scope text,
  p_metric_type text,
  p_tenant_id uuid,
  p_threshold_percent integer,
  p_is_active boolean,
  p_value_bytes bigint default null,
  p_capacity_bytes bigint default null,
  p_usage_percent numeric default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_severity text;
  v_id uuid;
  v_prev_active boolean;
  v_prev_severity text;
  v_prev_value_bytes bigint;
  v_prev_capacity_bytes bigint;
  v_prev_usage_percent numeric;
  v_changed boolean := false;
begin
  v_severity := case p_threshold_percent
    when 70 then 'warning'
    when 85 then 'high'
    when 95 then 'critical'
    else null end;

  if v_severity is null then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_THRESHOLD');
  end if;

  -- Capture previous state for transition detection
  select is_active, severity, last_value_bytes, last_capacity_bytes, last_usage_percent
  into v_prev_active, v_prev_severity, v_prev_value_bytes, v_prev_capacity_bytes, v_prev_usage_percent
  from public.infrastructure_alert_state
  where alert_scope = p_alert_scope
    and metric_type = p_metric_type
    and coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(p_tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and threshold_percent = p_threshold_percent;

  insert into public.infrastructure_alert_state (
    alert_scope, metric_type, tenant_id, threshold_percent, severity, is_active,
    active_since, last_triggered_at, last_recovered_at, last_value_bytes, last_capacity_bytes, last_usage_percent, metadata
  ) values (
    p_alert_scope, p_metric_type, p_tenant_id, p_threshold_percent, v_severity, p_is_active,
    case when p_is_active then now() else null end,
    case when p_is_active then now() else null end,
    case when not p_is_active then now() else null end,
    p_value_bytes, p_capacity_bytes, p_usage_percent, coalesce(p_metadata,'{}'::jsonb)
  )
  on conflict (alert_scope, metric_type, coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), threshold_percent)
  do update set
    severity = excluded.severity,
    last_value_bytes = excluded.last_value_bytes,
    last_capacity_bytes = excluded.last_capacity_bytes,
    last_usage_percent = excluded.last_usage_percent,
    metadata = coalesce(infrastructure_alert_state.metadata,'{}'::jsonb) || coalesce(excluded.metadata,'{}'::jsonb),
    updated_at = now()
  returning id into v_id;

  -- Determine if state meaningfully changed
  if v_prev_active is null then
    -- New state created: always a meaningful change
    v_changed := true;
  elsif v_prev_active <> p_is_active then
    -- Active/inactive transition
    v_changed := true;
  elsif v_prev_severity <> v_severity then
    -- Severity change
    v_changed := true;
  elsif p_is_active and (
    v_prev_value_bytes is distinct from p_value_bytes or
    v_prev_capacity_bytes is distinct from p_capacity_bytes or
    v_prev_usage_percent is distinct from p_usage_percent
  ) then
    -- Value change while active
    v_changed := true;
  end if;

  -- Update timestamps based on transition
  update public.infrastructure_alert_state s
  set is_active = p_is_active,
      active_since = case
        when p_is_active and not coalesce(v_prev_active, false) then now()
        when p_is_active then s.active_since
        else null
      end,
      last_triggered_at = case
        when p_is_active and not coalesce(v_prev_active, false) then now()
        else s.last_triggered_at
      end,
      last_recovered_at = case
        when (not p_is_active) and coalesce(v_prev_active, false) then now()
        else s.last_recovered_at
      end,
      updated_at = now()
  where s.id = v_id;

  return jsonb_build_object(
    'success', true,
    'id', v_id,
    'changed', v_changed,
    'is_active', p_is_active,
    'severity', v_severity
  );
end;
$$;

-- =============================================================================
-- Phase 8: Revoke get_tenant_storage_quota_bytes from authenticated
-- =============================================================================

revoke execute on function public.get_tenant_storage_quota_bytes(uuid) from authenticated;
-- Grant remains only to service_role (from migration 060)

-- =============================================================================
-- Phase 2: Add persistent reconciliation lock columns
-- =============================================================================

alter table public.storage_reconciliation_runs
  add column if not exists lock_token text,
  add column if not exists lock_acquired_at timestamptz,
  add column if not exists lease_expires_at timestamptz;

create index if not exists idx_storage_reconciliation_runs_lock_token
  on public.storage_reconciliation_runs (lock_token)
  where lock_token is not null;

-- =============================================================================
-- Phase 2: Replace start_storage_reconciliation_run with persistent lock
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
  v_got_lock boolean := false;
begin
  if p_trigger_source not in ('scheduled','manual','api','repair') then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_TRIGGER');
  end if;

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

  v_got_lock := true;

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

-- =============================================================================
-- Phase 2: Replace complete_storage_reconciliation_run with lock-owner verification
-- =============================================================================

create or replace function public.complete_storage_reconciliation_run(
  p_run_id uuid,
  p_status text,
  p_total_objects_scanned bigint default 0,
  p_total_actual_bytes bigint default null,
  p_total_internal_bytes bigint default null,
  p_tenants_scanned integer default 0,
  p_discrepancy_count integer default 0,
  p_orphan_object_count integer default 0,
  p_missing_object_count integer default 0,
  p_error_code text default null,
  p_error_message text default null,
  p_details jsonb default '{}'::jsonb,
  p_lock_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_status not in ('succeeded','failed','partial','aborted') then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_STATUS');
  end if;

  -- Verify lock ownership before allowing completion
  if p_lock_token is not null then
    update public.storage_reconciliation_runs
    set status = p_status,
        completed_at = now(),
        total_objects_scanned = coalesce(p_total_objects_scanned, 0),
        total_actual_bytes = p_total_actual_bytes,
        total_internal_bytes = p_total_internal_bytes,
        tenants_scanned = coalesce(p_tenants_scanned, 0),
        discrepancy_count = coalesce(p_discrepancy_count, 0),
        orphan_object_count = coalesce(p_orphan_object_count, 0),
        missing_object_count = coalesce(p_missing_object_count, 0),
        error_code = p_error_code,
        error_message = p_error_message,
        details = coalesce(details,'{}'::jsonb) || coalesce(p_details,'{}'::jsonb),
        lock_token = null,
        lock_acquired_at = null,
        lease_expires_at = null,
        updated_at = now()
    where id = p_run_id
      and lock_token = p_lock_token;

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'LOCK_OWNERSHIP_MISMATCH',
        'error', 'Run not found or lock token does not match owner'
      );
    end if;
  else
    -- No lock token provided: complete without lock release (best-effort)
    update public.storage_reconciliation_runs
    set status = p_status,
        completed_at = now(),
        total_objects_scanned = coalesce(p_total_objects_scanned, 0),
        total_actual_bytes = p_total_actual_bytes,
        total_internal_bytes = p_total_internal_bytes,
        tenants_scanned = coalesce(p_tenants_scanned, 0),
        discrepancy_count = coalesce(p_discrepancy_count, 0),
        orphan_object_count = coalesce(p_orphan_object_count, 0),
        missing_object_count = coalesce(p_missing_object_count, 0),
        error_code = p_error_code,
        error_message = p_error_message,
        details = coalesce(details,'{}'::jsonb) || coalesce(p_details,'{}'::jsonb),
        updated_at = now()
    where id = p_run_id;

    if not found then
      return jsonb_build_object('success', false, 'error_code', 'NOT_FOUND');
    end if;
  end if;

  return jsonb_build_object('success', true, 'run_id', p_run_id, 'status', p_status);
end;
$$;

-- =============================================================================
-- Phase 5A: Replace reserve_storage_quota - expired reservations never idempotent
-- =============================================================================

create or replace function public.reserve_storage_quota(
  p_tenant_id uuid,
  p_bucket_id text,
  p_storage_path text,
  p_object_key text,
  p_bytes bigint,
  p_source text default 'upload',
  p_replaces_storage_path text default null,
  p_replaces_bytes bigint default null,
  p_expires_in interval default interval '30 minutes'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_quota bigint;
  v_internal bigint;
  v_reserved bigint;
  v_existing public.storage_upload_reservations%rowtype;
  v_effective_reserved bigint;
  v_available bigint;
  v_replaces_credit bigint := 0;
begin
  if p_bytes is null or p_bytes <= 0 then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_BYTES', 'error', 'Bytes must be > 0');
  end if;
  if p_bucket_id not in ('product-images', 'store-assets') then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_BUCKET', 'error', 'Invalid bucket');
  end if;

  perform pg_advisory_xact_lock(public.tenant_advisory_lock_key(p_tenant_id));

  -- Idempotency: only match active 'reserved' reservations, never expired
  select *
  into v_existing
  from public.storage_upload_reservations
  where tenant_id = p_tenant_id
    and object_key = p_object_key
    and status = 'reserved'
  for update;

  if found then
    return jsonb_build_object(
      'success', true,
      'idempotent', true,
      'reservation_id', v_existing.id,
      'status', v_existing.status,
      'bytes', v_existing.bytes
    );
  end if;

  -- Clean up any expired reservation with same key (frees the object_key for retry)
  delete from public.storage_upload_reservations
  where tenant_id = p_tenant_id
    and object_key = p_object_key
    and status = 'expired';

  perform public.expire_storage_upload_reservations(p_tenant_id);
  perform public.ensure_tenant_storage_usage(p_tenant_id);

  v_quota := public.get_tenant_storage_quota_bytes(p_tenant_id);
  if v_quota is null then
    return jsonb_build_object('success', false, 'error_code', 'QUOTA_UNKNOWN', 'error', 'Storage quota unavailable; upload blocked for safety');
  end if;

  select internal_usage_bytes
  into v_internal
  from public.tenant_storage_usage
  where tenant_id = p_tenant_id
  for update;

  if v_internal is null then
    v_internal := 0;
  end if;

  select coalesce(sum(bytes), 0)
  into v_reserved
  from public.storage_upload_reservations
  where tenant_id = p_tenant_id
    and status = 'reserved'
    and expires_at > now();

  if p_replaces_bytes is not null and p_replaces_bytes > 0 then
    v_replaces_credit := p_replaces_bytes;
  end if;

  v_effective_reserved := greatest(v_reserved - v_replaces_credit, 0);

  if v_quota = -1 then
    insert into public.storage_upload_reservations (
      tenant_id, bucket_id, storage_path, object_key, bytes, status, source, replaces_storage_path, replaces_bytes, expires_at
    ) values (
      p_tenant_id, p_bucket_id, p_storage_path, p_object_key, p_bytes, 'reserved', coalesce(p_source, 'upload'),
      p_replaces_storage_path, p_replaces_bytes, now() + coalesce(p_expires_in, interval '30 minutes')
    )
    returning * into v_existing;

    return jsonb_build_object('success', true, 'idempotent', false, 'reservation_id', v_existing.id, 'status', 'reserved');
  end if;

  v_available := v_quota - v_internal - v_effective_reserved;
  if p_bytes > v_available then
    return jsonb_build_object(
      'success', false,
      'error_code', 'QUOTA_EXCEEDED',
      'error', 'Storage quota exceeded',
      'quota_bytes', v_quota,
      'internal_usage_bytes', v_internal,
      'reserved_bytes', v_reserved,
      'replaces_credit_bytes', v_replaces_credit,
      'requested_bytes', p_bytes
    );
  end if;

  insert into public.storage_upload_reservations (
    tenant_id, bucket_id, storage_path, object_key, bytes, status, source, replaces_storage_path, replaces_bytes, expires_at
  ) values (
    p_tenant_id, p_bucket_id, p_storage_path, p_object_key, p_bytes, 'reserved', coalesce(p_source, 'upload'),
    p_replaces_storage_path, p_replaces_bytes, now() + coalesce(p_expires_in, interval '30 minutes')
  )
  returning * into v_existing;

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'reservation_id', v_existing.id,
    'status', v_existing.status,
    'quota_bytes', v_quota,
    'internal_usage_bytes', v_internal,
    'reserved_bytes', v_reserved
  );
end;
$$;

-- =============================================================================
-- Phase 5B: Replace finalize_storage_upload_reservation - require actual bytes
-- =============================================================================

create or replace function public.finalize_storage_upload_reservation(
  p_tenant_id uuid,
  p_object_key text,
  p_actual_bytes bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_res public.storage_upload_reservations%rowtype;
  v_delta bigint;
begin
  perform pg_advisory_xact_lock(public.tenant_advisory_lock_key(p_tenant_id));
  perform public.ensure_tenant_storage_usage(p_tenant_id);

  select *
  into v_res
  from public.storage_upload_reservations
  where tenant_id = p_tenant_id and object_key = p_object_key
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'error', 'Reservation not found');
  end if;

  if v_res.status = 'finalized' then
    return jsonb_build_object('success', true, 'idempotent', true, 'reservation_id', v_res.id, 'status', 'finalized');
  end if;

  if v_res.status <> 'reserved' then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_STATE', 'error', 'Reservation not in reserved state', 'status', v_res.status);
  end if;

  -- Require actual uploaded bytes; never silently use reserved bytes as actual
  if p_actual_bytes is null or p_actual_bytes < 0 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ACTUAL_BYTES',
      'error', 'Actual uploaded bytes are required and must be >= 0',
      'reservation_id', v_res.id,
      'reserved_bytes', v_res.bytes
    );
  end if;

  v_delta := p_actual_bytes;

  update public.storage_upload_reservations
  set status = 'finalized',
      bytes = v_delta,
      finalized_at = now(),
      updated_at = now()
  where id = v_res.id;

  update public.tenant_storage_usage
  set internal_usage_bytes = internal_usage_bytes + v_delta,
      internal_status = 'ok',
      last_internal_update_at = now(),
      updated_at = now()
  where tenant_id = p_tenant_id;

  if v_res.replaces_bytes is not null and v_res.replaces_bytes > 0
     and coalesce((v_res.metadata->>'replaced_accounted')::boolean, false) = false then
    update public.tenant_storage_usage
    set internal_usage_bytes = greatest(internal_usage_bytes - v_res.replaces_bytes, 0),
        last_internal_update_at = now(),
        updated_at = now()
    where tenant_id = p_tenant_id;

    update public.storage_upload_reservations
    set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{replaced_accounted}', 'true'::jsonb, true)
    where id = v_res.id;
  end if;

  return jsonb_build_object('success', true, 'idempotent', false, 'reservation_id', v_res.id, 'status', 'finalized', 'bytes', v_delta);
end;
$$;

-- =============================================================================
-- Phase 4: Create get_database_size_bytes RPC (service_role only)
-- =============================================================================

create or replace function public.get_database_size_bytes()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_size bigint;
begin
  select pg_database_size(current_database()) into v_size;
  return v_size;
exception when others then
  return null;
end;
$$;

revoke execute on function public.get_database_size_bytes() from public;
grant execute on function public.get_database_size_bytes() to service_role;

-- =============================================================================
-- Phase 4: Create get_largest_tables RPC (service_role only)
-- =============================================================================

create or replace function public.get_largest_tables(p_limit integer default 20)
returns table (
  schema_name text,
  table_name text,
  total_bytes bigint,
  table_bytes bigint,
  index_bytes bigint,
  row_estimate bigint
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  return query
  select
    n.nspname as schema_name,
    c.relname as table_name,
    pg_total_relation_size(c.oid) as total_bytes,
    pg_relation_size(c.oid) as table_bytes,
    (pg_total_relation_size(c.oid) - pg_relation_size(c.oid)) as index_bytes,
    c.reltuples::bigint as row_estimate
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'r'
    and n.nspname not in ('pg_catalog', 'information_schema')
    and n.nspname not like 'pg_toast%'
  order by pg_total_relation_size(c.oid) desc
  limit p_limit;
exception when others then
  return;
end;
$$;

revoke execute on function public.get_largest_tables(integer) from public;
grant execute on function public.get_largest_tables(integer) to service_role;

-- End of migration 061 (source only, not applied)
