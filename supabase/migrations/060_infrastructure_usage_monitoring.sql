-- Infrastructure Usage Monitoring: storage accounting, reservations, reconciliation, snapshots, capacity, alerts
-- Migration 060 (next after 059). Created in source; NOT executed against live database.
--
-- Design goals:
-- - Centralized tenant storage accounting (internal counters + reconciled actual bytes)
-- - Atomic, retry-safe quota reservation for uploads (prevents read-then-write races)
-- - Reconciliation run history and discrepancy audit trail (idempotent, lock-protected)
-- - Historical infrastructure snapshots (storage + database)
-- - Manually-configurable infrastructure capacity (authoritative source metadata required)
-- - Threshold alert state tracking (infra-level and tenant-level) with recovery/de-duplication
--
-- NOTE: Scheduling (pg_cron/Edge Function/host cron) requires external configuration.
-- This migration creates only database primitives. No live SQL execution is performed by this change.

-- =============================================================================
-- 1. Tenant storage accounting
-- =============================================================================

create table if not exists public.tenant_storage_usage (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  internal_usage_bytes bigint not null default 0 check (internal_usage_bytes >= 0),
  actual_usage_bytes bigint,
  internal_status text not null default 'ok' check (internal_status in ('ok', 'stale', 'error', 'unavailable')),
  actual_status text not null default 'unavailable' check (actual_status in ('ok', 'stale', 'error', 'unavailable')),
  last_internal_update_at timestamptz,
  last_reconciled_at timestamptz,
  reconciliation_status text not null default 'never_run' check (reconciliation_status in ('never_run', 'ok', 'stale', 'failed', 'running')),
  last_reconciliation_run_id uuid,
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tenant_storage_usage_reconciliation_status
  on public.tenant_storage_usage (reconciliation_status);
create index if not exists idx_tenant_storage_usage_internal_usage
  on public.tenant_storage_usage (internal_usage_bytes desc);

drop trigger if exists set_tenant_storage_usage_updated_at on public.tenant_storage_usage;
create trigger set_tenant_storage_usage_updated_at
  before update on public.tenant_storage_usage
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 2. Upload reservations (atomic quota holds)
-- =============================================================================

create table if not exists public.storage_upload_reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  bucket_id text not null check (bucket_id in ('product-images', 'store-assets')),
  storage_path text not null,
  object_key text not null, -- idempotency key per logical upload attempt (client/server generated)
  bytes bigint not null check (bytes > 0),
  status text not null default 'reserved' check (status in ('reserved', 'finalized', 'released', 'expired', 'failed')),
  source text not null default 'upload' check (source in ('upload', 'replace', 'migration', 'repair')),
  replaces_storage_path text,
  replaces_bytes bigint check (replaces_bytes is null or replaces_bytes >= 0),
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  finalized_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint storage_upload_reservations_tenant_object_key_unique unique (tenant_id, object_key)
);

create index if not exists idx_storage_upload_reservations_tenant_status
  on public.storage_upload_reservations (tenant_id, status, expires_at);
create index if not exists idx_storage_upload_reservations_path
  on public.storage_upload_reservations (storage_path);

drop trigger if exists set_storage_upload_reservations_updated_at on public.storage_upload_reservations;
create trigger set_storage_upload_reservations_updated_at
  before update on public.storage_upload_reservations
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 3. Reconciliation runs and discrepancies
-- =============================================================================

create table if not exists public.storage_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_source text not null check (trigger_source in ('scheduled', 'manual', 'api', 'repair')),
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed', 'partial', 'aborted')),
  scheduled_for date, -- Dhaka schedule date (06:00 Asia/Dhaka / 00:00 UTC) for idempotent daily runs
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  locked boolean not null default true,
  total_objects_scanned bigint not null default 0,
  total_actual_bytes bigint,
  total_internal_bytes bigint,
  tenants_scanned integer not null default 0,
  discrepancy_count integer not null default 0,
  orphan_object_count integer not null default 0,
  missing_object_count integer not null default 0,
  error_code text,
  error_message text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_storage_reconciliation_runs_scheduled_for_unique
  on public.storage_reconciliation_runs (scheduled_for)
  where scheduled_for is not null and status in ('running', 'succeeded', 'partial');

create index if not exists idx_storage_reconciliation_runs_status_started
  on public.storage_reconciliation_runs (status, started_at desc);

drop trigger if exists set_storage_reconciliation_runs_updated_at on public.storage_reconciliation_runs;
create trigger set_storage_reconciliation_runs_updated_at
  before update on public.storage_reconciliation_runs
  for each row execute function public.set_updated_at();

create table if not exists public.storage_reconciliation_discrepancies (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.storage_reconciliation_runs (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete set null,
  bucket_id text check (bucket_id in ('product-images', 'store-assets')),
  storage_path text,
  discrepancy_type text not null check (discrepancy_type in (
    'internal_mismatch', 'orphan_object', 'missing_object', 'tenant_unmapped', 'scan_error'
  )),
  internal_bytes bigint,
  actual_bytes bigint,
  delta_bytes bigint,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_storage_reconciliation_discrepancies_run
  on public.storage_reconciliation_discrepancies (run_id);
create index if not exists idx_storage_reconciliation_discrepancies_tenant
  on public.storage_reconciliation_discrepancies (tenant_id, created_at desc);

-- =============================================================================
-- 4. Infrastructure usage snapshots (historical)
-- =============================================================================

create table if not exists public.infrastructure_usage_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  metric_type text not null check (metric_type in ('storage_total', 'storage_tenant', 'database_size', 'database_table')),
  scope text not null check (scope in ('global', 'tenant', 'table')),
  tenant_id uuid references public.tenants (id) on delete cascade,
  object_name text,
  value_bytes bigint check (value_bytes is null or value_bytes >= 0),
  secondary_value_bytes bigint,
  source text not null check (source in ('internal', 'actual', 'reconciled', 'pg_database_size', 'pg_total_relation_size', 'manual')),
  accuracy text not null check (accuracy in ('EXACT', 'DERIVED', 'ESTIMATED', 'UNAVAILABLE')),
  status text not null check (status in ('ok', 'stale', 'failed', 'unavailable')),
  metadata jsonb not null default '{}'::jsonb,
  measured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Idempotent: add the scope/tag check constraint only if it does not already exist.
-- Handles partial migration runs where the table was created but the migration
-- failed before completing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'infrastructure_usage_snapshots_scope_check'
      AND conrelid = 'public.infrastructure_usage_snapshots'::regclass
  ) THEN
    ALTER TABLE public.infrastructure_usage_snapshots
    ADD CONSTRAINT infrastructure_usage_snapshots_scope_check
    CHECK (
      (scope = 'tenant' and tenant_id is not null) or
      (scope = 'global' and tenant_id is null) or
      (scope = 'table' and object_name is not null)
    );
  END IF;
END $$;

create index if not exists idx_infra_usage_snapshots_metric_date
  on public.infrastructure_usage_snapshots (metric_type, snapshot_date desc);
create index if not exists idx_infra_usage_snapshots_tenant_date
  on public.infrastructure_usage_snapshots (tenant_id, metric_type, snapshot_date desc);

create unique index if not exists idx_infra_usage_snapshots_daily_unique
  on public.infrastructure_usage_snapshots (
    snapshot_date, metric_type, scope, coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(object_name, '')
  );

-- =============================================================================
-- 5. Infrastructure capacity configuration (manually managed, source-tracked)
-- =============================================================================

create table if not exists public.infrastructure_capacity_config (
  id uuid primary key default gen_random_uuid(),
  metric_type text not null check (metric_type in ('storage', 'database')),
  capacity_bytes bigint check (capacity_bytes is null or capacity_bytes > 0),
  is_configured boolean not null default false,
  source_type text not null default 'unconfigured' check (source_type in ('unconfigured', 'manual', 'supabase_api', 'supabase_dashboard')),
  source_label text,
  notes text,
  configured_by uuid references auth.users (id) on delete set null,
  configured_at timestamptz,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint infrastructure_capacity_config_metric_unique unique (metric_type)
);

drop trigger if exists set_infrastructure_capacity_config_updated_at on public.infrastructure_capacity_config;
create trigger set_infrastructure_capacity_config_updated_at
  before update on public.infrastructure_capacity_config
  for each row execute function public.set_updated_at();

insert into public.infrastructure_capacity_config (metric_type, capacity_bytes, is_configured, source_type, verified)
values
  ('storage', null, false, 'unconfigured', false),
  ('database', null, false, 'unconfigured', false)
on conflict (metric_type) do nothing;

-- =============================================================================
-- 6. Alert state tracking (dedupe + recovery)
-- =============================================================================

create table if not exists public.infrastructure_alert_state (
  id uuid primary key default gen_random_uuid(),
  alert_scope text not null check (alert_scope in ('infrastructure', 'tenant')),
  metric_type text not null check (metric_type in ('storage', 'database')),
  tenant_id uuid references public.tenants (id) on delete cascade,
  threshold_percent integer not null check (threshold_percent in (70, 85, 95)),
  severity text not null check (severity in ('warning', 'high', 'critical')),
  is_active boolean not null default false,
  active_since timestamptz,
  last_triggered_at timestamptz,
  last_recovered_at timestamptz,
  last_notified_at timestamptz,
  last_value_bytes bigint,
  last_capacity_bytes bigint,
  last_usage_percent numeric(7,3),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint infrastructure_alert_state_scope_check check (
    (alert_scope = 'tenant' and tenant_id is not null) or
    (alert_scope = 'infrastructure' and tenant_id is null)
  )
);

create unique index if not exists idx_infra_alert_state_unique
  on public.infrastructure_alert_state (
    alert_scope, metric_type, coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), threshold_percent
  );
create index if not exists idx_infra_alert_state_active
  on public.infrastructure_alert_state (is_active, metric_type, alert_scope);

drop trigger if exists set_infrastructure_alert_state_updated_at on public.infrastructure_alert_state;
create trigger set_infrastructure_alert_state_updated_at
  before update on public.infrastructure_alert_state
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 7. Helper / RPC functions
-- =============================================================================

create or replace function public.ensure_tenant_storage_usage(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.tenant_storage_usage (tenant_id)
  values (p_tenant_id)
  on conflict (tenant_id) do nothing;
end;
$$;

create or replace function public.expire_storage_upload_reservations(p_tenant_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_count integer;
begin
  update public.storage_upload_reservations r
  set status = 'expired',
      released_at = now(),
      updated_at = now()
  where r.status = 'reserved'
    and r.expires_at <= now()
    and (p_tenant_id is null or r.tenant_id = p_tenant_id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.get_tenant_storage_quota_bytes(p_tenant_id uuid)
returns bigint
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_quota bigint;
begin
  select p.storage_limit_bytes
  into v_quota
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.tenant_id = p_tenant_id
    and s.status in ('active', 'trialing', 'past_due', 'suspended', 'canceled', 'expired')
  order by s.current_period_end desc
  limit 1;

  if not found then
    select p.storage_limit_bytes
    into v_quota
    from public.tenants t
    join public.plans p on p.id = t.plan_id
    where t.id = p_tenant_id;
  end if;

  return v_quota;
end;
$$;

-- Reserve quota atomically for an upload (idempotent by tenant_id + object_key).
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

  select *
  into v_existing
  from public.storage_upload_reservations
  where tenant_id = p_tenant_id and object_key = p_object_key
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
    returning id into v_existing.id;

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

  v_delta := coalesce(p_actual_bytes, v_res.bytes);

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

create or replace function public.release_storage_upload_reservation(
  p_tenant_id uuid,
  p_object_key text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_res public.storage_upload_reservations%rowtype;
begin
  perform pg_advisory_xact_lock(public.tenant_advisory_lock_key(p_tenant_id));

  select *
  into v_res
  from public.storage_upload_reservations
  where tenant_id = p_tenant_id and object_key = p_object_key
  for update;

  if not found then
    return jsonb_build_object('success', true, 'idempotent', true, 'status', 'not_found');
  end if;

  if v_res.status in ('released', 'expired', 'failed') then
    return jsonb_build_object('success', true, 'idempotent', true, 'reservation_id', v_res.id, 'status', v_res.status);
  end if;

  if v_res.status = 'finalized' then
    return jsonb_build_object('success', false, 'error_code', 'ALREADY_FINALIZED', 'error', 'Cannot release finalized reservation');
  end if;

  update public.storage_upload_reservations
  set status = 'released',
      released_at = now(),
      updated_at = now(),
      metadata = case when p_reason is null then metadata else jsonb_set(coalesce(metadata,'{}'::jsonb), '{release_reason}', to_jsonb(p_reason), true) end
  where id = v_res.id;

  return jsonb_build_object('success', true, 'idempotent', false, 'reservation_id', v_res.id, 'status', 'released');
end;
$$;

create or replace function public.adjust_tenant_internal_storage_usage(
  p_tenant_id uuid,
  p_delta_bytes bigint,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_new bigint;
begin
  perform pg_advisory_xact_lock(public.tenant_advisory_lock_key(p_tenant_id));
  perform public.ensure_tenant_storage_usage(p_tenant_id);

  update public.tenant_storage_usage
  set internal_usage_bytes = greatest(internal_usage_bytes + p_delta_bytes, 0),
      internal_status = 'ok',
      last_internal_update_at = now(),
      notes = case when p_reason is null then notes else jsonb_set(coalesce(notes,'{}'::jsonb), '{last_adjustment_reason}', to_jsonb(p_reason), true) end,
      updated_at = now()
  where tenant_id = p_tenant_id
  returning internal_usage_bytes into v_new;

  return jsonb_build_object('success', true, 'internal_usage_bytes', v_new);
end;
$$;

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
begin
  v_severity := case p_threshold_percent
    when 70 then 'warning'
    when 85 then 'high'
    when 95 then 'critical'
    else null end;
  if v_severity is null then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_THRESHOLD');
  end if;

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

  select is_active into v_prev_active
  from public.infrastructure_alert_state
  where id = v_id;

  update public.infrastructure_alert_state s
  set is_active = p_is_active,
      active_since = case when p_is_active and not coalesce(v_prev_active,false) then now() when p_is_active then s.active_since else null end,
      last_triggered_at = case when p_is_active and not coalesce(v_prev_active,false) then now() else s.last_triggered_at end,
      last_recovered_at = case when (not p_is_active) and coalesce(v_prev_active,false) then now() else s.last_recovered_at end,
      updated_at = now()
  where s.id = v_id;

  return jsonb_build_object('success', true, 'id', v_id, 'is_active', p_is_active, 'severity', v_severity);
end;
$$;

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
  v_lock_key bigint := 860060001;
  v_got_lock boolean;
begin
  if p_trigger_source not in ('scheduled','manual','api','repair') then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_TRIGGER');
  end if;

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

  v_got_lock := pg_try_advisory_xact_lock(v_lock_key);
  if not v_got_lock then
    return jsonb_build_object('success', false, 'error_code', 'LOCK_NOT_ACQUIRED', 'error', 'Another reconciliation run is in progress');
  end if;

  insert into public.storage_reconciliation_runs (trigger_source, status, scheduled_for, started_at, locked)
  values (p_trigger_source, 'running', p_scheduled_for, now(), true)
  returning id into v_run_id;

  return jsonb_build_object('success', true, 'idempotent', false, 'run_id', v_run_id, 'status', 'running');
end;
$$;

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
  p_details jsonb default '{}'::jsonb
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

  return jsonb_build_object('success', true, 'run_id', p_run_id, 'status', p_status);
end;
$$;

-- =============================================================================
-- 8. RLS and grants
-- =============================================================================

alter table public.tenant_storage_usage enable row level security;
alter table public.storage_upload_reservations enable row level security;
alter table public.storage_reconciliation_runs enable row level security;
alter table public.storage_reconciliation_discrepancies enable row level security;
alter table public.infrastructure_usage_snapshots enable row level security;
alter table public.infrastructure_capacity_config enable row level security;
alter table public.infrastructure_alert_state enable row level security;

drop policy if exists "Super admins can read tenant storage usage" on public.tenant_storage_usage;
create policy "Super admins can read tenant storage usage"
  on public.tenant_storage_usage for select to authenticated
  using (public.is_super_admin());

drop policy if exists "Tenant members can read own tenant storage usage" on public.tenant_storage_usage;
create policy "Tenant members can read own tenant storage usage"
  on public.tenant_storage_usage for select to authenticated
  using (public.is_tenant_member(tenant_id));

drop policy if exists "Super admins can read storage upload reservations" on public.storage_upload_reservations;
create policy "Super admins can read storage upload reservations"
  on public.storage_upload_reservations for select to authenticated
  using (public.is_super_admin());

drop policy if exists "Tenant members can read own storage upload reservations" on public.storage_upload_reservations;
create policy "Tenant members can read own storage upload reservations"
  on public.storage_upload_reservations for select to authenticated
  using (public.is_tenant_member(tenant_id));

drop policy if exists "Super admins can read reconciliation runs" on public.storage_reconciliation_runs;
create policy "Super admins can read reconciliation runs"
  on public.storage_reconciliation_runs for select to authenticated
  using (public.is_super_admin());

drop policy if exists "Super admins can read reconciliation discrepancies" on public.storage_reconciliation_discrepancies;
create policy "Super admins can read reconciliation discrepancies"
  on public.storage_reconciliation_discrepancies for select to authenticated
  using (public.is_super_admin());

drop policy if exists "Super admins can read infrastructure usage snapshots" on public.infrastructure_usage_snapshots;
create policy "Super admins can read infrastructure usage snapshots"
  on public.infrastructure_usage_snapshots for select to authenticated
  using (public.is_super_admin());

drop policy if exists "Super admins can read infrastructure capacity config" on public.infrastructure_capacity_config;
create policy "Super admins can read infrastructure capacity config"
  on public.infrastructure_capacity_config for select to authenticated
  using (public.is_super_admin());

drop policy if exists "Super admins can manage infrastructure capacity config" on public.infrastructure_capacity_config;
create policy "Super admins can manage infrastructure capacity config"
  on public.infrastructure_capacity_config for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Super admins can read infrastructure alert state" on public.infrastructure_alert_state;
create policy "Super admins can read infrastructure alert state"
  on public.infrastructure_alert_state for select to authenticated
  using (public.is_super_admin());

grant select on public.tenant_storage_usage to authenticated;
grant select on public.storage_upload_reservations to authenticated;
grant select on public.storage_reconciliation_runs to authenticated;
grant select on public.storage_reconciliation_discrepancies to authenticated;
grant select on public.infrastructure_usage_snapshots to authenticated;
grant select, insert, update on public.infrastructure_capacity_config to authenticated;
grant select on public.infrastructure_alert_state to authenticated;

grant all on public.tenant_storage_usage to service_role;
grant all on public.storage_upload_reservations to service_role;
grant all on public.storage_reconciliation_runs to service_role;
grant all on public.storage_reconciliation_discrepancies to service_role;
grant all on public.infrastructure_usage_snapshots to service_role;
grant all on public.infrastructure_capacity_config to service_role;
grant all on public.infrastructure_alert_state to service_role;

revoke execute on function public.ensure_tenant_storage_usage(uuid) from public;
revoke execute on function public.expire_storage_upload_reservations(uuid) from public;
revoke execute on function public.get_tenant_storage_quota_bytes(uuid) from public;
revoke execute on function public.reserve_storage_quota(uuid,text,text,text,bigint,text,text,bigint,interval) from public;
revoke execute on function public.finalize_storage_upload_reservation(uuid,text,bigint) from public;
revoke execute on function public.release_storage_upload_reservation(uuid,text,text) from public;
revoke execute on function public.adjust_tenant_internal_storage_usage(uuid,bigint,text) from public;
revoke execute on function public.upsert_infrastructure_alert_state(text,text,uuid,integer,boolean,bigint,bigint,numeric,jsonb) from public;
revoke execute on function public.start_storage_reconciliation_run(text,date) from public;
revoke execute on function public.complete_storage_reconciliation_run(uuid,text,bigint,bigint,bigint,integer,integer,integer,integer,text,text,jsonb) from public;

grant execute on function public.ensure_tenant_storage_usage(uuid) to service_role;
grant execute on function public.expire_storage_upload_reservations(uuid) to service_role;
grant execute on function public.get_tenant_storage_quota_bytes(uuid) to authenticated, service_role;
grant execute on function public.reserve_storage_quota(uuid,text,text,text,bigint,text,text,bigint,interval) to service_role;
grant execute on function public.finalize_storage_upload_reservation(uuid,text,bigint) to service_role;
grant execute on function public.release_storage_upload_reservation(uuid,text,text) to service_role;
grant execute on function public.adjust_tenant_internal_storage_usage(uuid,bigint,text) to service_role;
grant execute on function public.upsert_infrastructure_alert_state(text,text,uuid,integer,boolean,bigint,bigint,numeric,jsonb) to service_role;
grant execute on function public.start_storage_reconciliation_run(text,date) to service_role;
grant execute on function public.complete_storage_reconciliation_run(uuid,text,bigint,bigint,bigint,integer,integer,integer,integer,text,text,jsonb) to service_role;

-- End of migration 060 (source only, not applied)
