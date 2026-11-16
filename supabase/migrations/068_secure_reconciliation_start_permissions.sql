-- Migration 068: Secure start_storage_reconciliation_run permissions
-- Corrective migration applied AFTER migrations 060, 061, 063, 064, 065, 066, and 067.
--
-- Problem: public.start_storage_reconciliation_run(text, date) has EXECUTE
-- privileges granted to anon and authenticated roles, which should be restricted
-- to service_role only.
--
-- Correction:
--   1. REVOKE EXECUTE FROM PUBLIC
--   2. REVOKE EXECUTE FROM anon
--   3. REVOKE EXECUTE FROM authenticated
--   4. GRANT EXECUTE TO service_role
--
-- Source only; NOT executed against live database.

REVOKE EXECUTE
ON FUNCTION public.start_storage_reconciliation_run(text, date)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.start_storage_reconciliation_run(text, date)
FROM anon;

REVOKE EXECUTE
ON FUNCTION public.start_storage_reconciliation_run(text, date)
FROM authenticated;

GRANT EXECUTE
ON FUNCTION public.start_storage_reconciliation_run(text, date)
TO service_role;

-- End of migration 068 (source only, not applied)
