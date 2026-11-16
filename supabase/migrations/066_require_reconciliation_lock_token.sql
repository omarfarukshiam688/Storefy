-- Migration 066: Require reconciliation lock token for completion
-- Corrective migration applied AFTER migrations 060, 061, and 065.
--
-- Problem: public.complete_storage_reconciliation_run declares its final
-- parameter as `p_lock_token text DEFAULT NULL`. The function body contains
-- an else branch that completes a run by ID alone (without lock ownership
-- validation) when p_lock_token is NULL. This NULL-token branch is a latent
-- security hole: any caller that omits or passes NULL can complete any
-- reconciliation run regardless of lock ownership.
--
-- Corrections:
--   1. CREATE OR REPLACE FUNCTION with the exact same 13-parameter signature.
--   2. Remove DEFAULT NULL from p_lock_token (declare as `p_lock_token text`).
--   3. Add explicit NULL-token rejection guard near the top of the function.
--   4. Remove the entire NULL-token ELSE branch.
--   5. Retain the ownership-protected UPDATE: WHERE id = p_run_id AND lock_token = p_lock_token.
--   6. Reassert permissions: REVOKE ALL from PUBLIC/anon/authenticated, GRANT EXECUTE to service_role.
--
-- Source only; NOT executed against live database.

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
  -- Reject NULL lock tokens immediately; do not modify any reconciliation run
  if p_lock_token is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'LOCK_TOKEN_REQUIRED',
      'error', 'Lock token is required to complete a reconciliation run'
    );
  end if;

  if p_status not in ('succeeded','failed','partial','aborted') then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_STATUS');
  end if;

  -- Verify lock ownership before allowing completion
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

  return jsonb_build_object('success', true, 'run_id', p_run_id, 'status', p_status);
end;
$$;

-- Reassert explicit privilege restrictions on the function
revoke all on function public.complete_storage_reconciliation_run(
    uuid,
    text,
    bigint,
    bigint,
    bigint,
    integer,
    integer,
    integer,
    integer,
    text,
    text,
    jsonb,
    text
) from public;

revoke all on function public.complete_storage_reconciliation_run(
    uuid,
    text,
    bigint,
    bigint,
    bigint,
    integer,
    integer,
    integer,
    integer,
    text,
    text,
    jsonb,
    text
) from anon;

revoke all on function public.complete_storage_reconciliation_run(
    uuid,
    text,
    bigint,
    bigint,
    bigint,
    integer,
    integer,
    integer,
    integer,
    text,
    text,
    jsonb,
    text
) from authenticated;

grant execute on function public.complete_storage_reconciliation_run(
    uuid,
    text,
    bigint,
    bigint,
    bigint,
    integer,
    integer,
    integer,
    integer,
    text,
    text,
    jsonb,
    text
) to service_role;

-- =============================================================================
-- Read-only verification queries (do not execute against the live database
-- unless performing a post-migration audit).
-- =============================================================================

-- Verification 1: Exactly one overload remains
-- SELECT COUNT(*) AS overload_count
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname = 'complete_storage_reconciliation_run';

-- Expected: 1

-- Verification 2: Final parameter has no default value
-- SELECT p.proname, p.proargnames, p.proargdefaults
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname = 'complete_storage_reconciliation_run';

-- Expected: proargdefaults should have one fewer element than proargnames
-- (defaults for params 1-11, none for param 12 which is p_lock_token)

-- Verification 3: Function source contains explicit NULL-token rejection
-- SELECT pg_get_functiondef(p.oid) as function_source
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname = 'complete_storage_reconciliation_run';

-- Expected: Source contains 'LOCK_TOKEN_REQUIRED' and 'p_lock_token is null'

-- Verification 4: NULL-token UPDATE branch no longer exists
-- SELECT pg_get_functiondef(p.oid) as function_source
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname = 'complete_storage_reconciliation_run';

-- Expected: Source does NOT contain 'else' followed by an UPDATE with only 'where id = p_run_id'

-- Verification 5: Only UPDATE completion path includes both run ID and lock-token matching
-- SELECT pg_get_functiondef(p.oid) as function_source
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname = 'complete_storage_reconciliation_run';

-- Expected: Only one UPDATE statement; WHERE clause contains 'id = p_run_id AND lock_token = p_lock_token'

-- Verification 6: anon cannot execute
-- SELECT rp.grantee
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- JOIN information_schema.routine_privileges rp
--   ON rp.specific_schema = n.nspname
--   AND rp.specific_name = p.proname
--   AND rp.routine_type = 'FUNCTION'
-- WHERE n.nspname = 'public'
--   AND p.proname = 'complete_storage_reconciliation_run'
--   AND pg_get_function_arguments(p.oid) =
--       'uuid, text, bigint, bigint, bigint, integer, integer, integer, integer, text, text, jsonb, text'
--   AND rp.privilege_type = 'EXECUTE'
--   AND rp.grantee = 'anon';

-- Expected: 0 rows

-- Verification 7: authenticated cannot execute
-- Same query as Verification 6 but rp.grantee = 'authenticated'

-- Expected: 0 rows

-- Verification 8: service_role can execute
-- Same query as Verification 6 but rp.grantee = 'service_role'

-- Expected: 1 row

-- Verification 9: SECURITY DEFINER and search_path unchanged
-- SELECT p.prosecdef as security_definer, array_to_string(p.proconfig, ', ') as proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname = 'complete_storage_reconciliation_run';

-- Expected: security_definer = true, proconfig contains 'search_path=pg_catalog,public'

-- End of migration 066 (source only, not applied)
