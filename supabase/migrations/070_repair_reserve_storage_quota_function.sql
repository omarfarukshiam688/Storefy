-- Migration 070: Repair reserve_storage_quota function body
-- Corrective migration applied AFTER migrations 060, 061, 062, 063, 064, 065, 066, 067, 068, and 069.
--
-- Problem: The live database function public.reserve_storage_quota(...) contains
-- an unrelated verification SELECT appended inside its function body after the
-- final RETURN statement.
--
-- Correction: Recreate the function using CREATE OR REPLACE with the exact
-- original body from migration 062, excluding any unrelated verification SQL.
-- No GRANT or REVOKE statements are included; existing ACL established by
-- migration 069 is preserved.
--
-- Source only; NOT executed against live database.

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

  -- Do NOT delete expired rows — preserve audit history.
  -- The partial unique index on status='reserved' allows reuse of object_key
  -- by new reservations even when expired rows with the same key exist.

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

-- End of migration 070 (source only, not applied)
