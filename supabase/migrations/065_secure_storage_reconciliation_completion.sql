-- Migration 065: Secure reconciliation completion function
-- Corrective migration applied AFTER migrations 060 and 061.
--
-- Problem 1: Migration 060 created complete_storage_reconciliation_run with
--   12 parameters (uuid,text,...,jsonb). Migration 061 added a 13th parameter
--   (p_lock_token) but CREATE OR REPLACE does not match signatures with
--   different arity, so the old 12-parameter overload still exists in the
--   database. The old overload has NO lock-token ownership check and can be
--   used to bypass reconciliation concurrency protection.
--
-- Problem 2: Migration 061 created the new 13-parameter overload but did not
--   include REVOKE/GRANT statements for it. PostgreSQL defaults new functions
--   to EXECUTE for PUBLIC, so anon, authenticated, and PUBLIC can all call
--   the new function, bypassing service_role-only restrictions.
--
-- Corrections:
--   1. Drop ONLY the old 12-parameter overload (no CASCADE).
--   2. Revoke ALL from PUBLIC, anon, authenticated on the new 13-parameter
--      overload.
--   3. GRANT EXECUTE only to service_role on the new overload.
--
-- Source only; NOT executed against live database.

-- =============================================================================
-- Step 1: Remove the obsolete 12-parameter overload
-- =============================================================================

DROP FUNCTION public.complete_storage_reconciliation_run(
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
    jsonb
);

-- =============================================================================
-- Step 2: Revoke all privileges from PUBLIC, anon, authenticated
-- =============================================================================

REVOKE ALL ON FUNCTION public.complete_storage_reconciliation_run(
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
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.complete_storage_reconciliation_run(
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
) FROM anon;

REVOKE ALL ON FUNCTION public.complete_storage_reconciliation_run(
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
) FROM authenticated;

-- =============================================================================
-- Step 3: Grant EXECUTE only to service_role
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.complete_storage_reconciliation_run(
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
) TO service_role;

-- =============================================================================
-- Read-only verification queries (do not execute against the live database
-- unless you are performing a post-migration audit).
-- =============================================================================

-- Verification 1: Exactly one overload of complete_storage_reconciliation_run remains
-- SELECT COUNT(*) AS overload_count
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname = 'complete_storage_reconciliation_run';

-- Expected: 1

-- Verification 2: The remaining function has the exact 13-parameter signature
-- SELECT pg_get_function_arguments(p.oid) as arguments
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname = 'complete_storage_reconciliation_run';

-- Expected: uuid, text, bigint, bigint, bigint, integer, integer, integer,
--           integer, text, text, jsonb, text

-- Verification 3: PUBLIC, anon, authenticated do not have EXECUTE
-- SELECT r.rolname as grantee
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- JOIN information_schema.routine_privileges rp
--   ON rp.specific_schema = n.nspname
--   AND rp.specific_name = p.proname
--   AND rp.routine_type = 'FUNCTION'
-- JOIN pg_roles r ON r.rolname = rp.grantee
-- WHERE n.nspname = 'public'
--   AND p.proname = 'complete_storage_reconciliation_run'
--   AND pg_get_function_arguments(p.oid) =
--       'uuid, text, bigint, bigint, bigint, integer, integer, integer, integer, text, text, jsonb, text'
--   AND rp.privilege_type = 'EXECUTE'
--   AND r.rolname IN ('PUBLIC', 'anon', 'authenticated');

-- Expected: 0 rows

-- Verification 4: service_role has EXECUTE
-- SELECT r.rolname as grantee
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- JOIN information_schema.routine_privileges rp
--   ON rp.specific_schema = n.nspname
--   AND rp.specific_name = p.proname
--   AND rp.routine_type = 'FUNCTION'
-- JOIN pg_roles r ON r.rolname = rp.grantee
-- WHERE n.nspname = 'public'
--   AND p.proname = 'complete_storage_reconciliation_run'
--   AND pg_get_function_arguments(p.oid) =
--       'uuid, text, bigint, bigint, bigint, integer, integer, integer, integer, text, text, jsonb, text'
--   AND rp.privilege_type = 'EXECUTE'
--   AND r.rolname = 'service_role';

-- Expected: 1 row

-- Verification 5: Remaining function contains lock-token ownership validation
-- SELECT pg_get_functiondef(p.oid) as function_source
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname = 'complete_storage_reconciliation_run'
--   AND pg_get_function_arguments(p.oid) =
--       'uuid, text, bigint, bigint, bigint, integer, integer, integer, integer, text, text, jsonb, text';

-- Expected: Source contains 'lock_token = p_lock_token' in WHERE clause

-- Verification 6: No unrelated function privileges changed (spot check on
-- reserve_storage_quota which should remain service_role-only)
-- SELECT rp.grantee
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- JOIN information_schema.routine_privileges rp
--   ON rp.specific_schema = n.nspname
--   AND rp.specific_name = p.proname
--   AND rp.routine_type = 'FUNCTION'
-- WHERE n.nspname = 'public'
--   AND p.proname = 'reserve_storage_quota'
--   AND pg_get_function_arguments(p.oid) =
--       'uuid, text, text, text, bigint, text, text, bigint, interval'
--   AND rp.privilege_type = 'EXECUTE';

-- Expected: 1 row with grantee = 'service_role'

-- End of migration 065 (source only, not applied)
