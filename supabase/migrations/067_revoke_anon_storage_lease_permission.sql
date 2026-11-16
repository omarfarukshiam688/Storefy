-- Migration 067: Revoke anon EXECUTE on renew_storage_reconciliation_lease
-- Corrective migration applied AFTER migrations 060, 061, 062, 064, 065, and 066.
--
-- Problem: Migration 062 revoked EXECUTE from PUBLIC and authenticated on
-- public.renew_storage_reconciliation_lease(uuid, text, interval) but did not
-- explicitly revoke it from anon. PostgreSQL's PUBLIC role encompasses all
-- roles including anon, but an explicit REVOKE FROM anon ensures the
-- permission is fully removed even if anon was granted directly.
--
-- Correction:
--   1. REVOKE EXECUTE FROM PUBLIC (covers all roles including anon by default)
--   2. REVOKE EXECUTE FROM anon (explicit removal)
--   3. REVOKE EXECUTE FROM authenticated (ensure no authenticated access)
--   4. GRANT EXECUTE TO service_role (maintain expected access)
--
-- Source only; NOT executed against live database.

REVOKE EXECUTE
ON FUNCTION public.renew_storage_reconciliation_lease(uuid, text, interval)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.renew_storage_reconciliation_lease(uuid, text, interval)
FROM anon;

REVOKE EXECUTE
ON FUNCTION public.renew_storage_reconciliation_lease(uuid, text, interval)
FROM authenticated;

GRANT EXECUTE
ON FUNCTION public.renew_storage_reconciliation_lease(uuid, text, interval)
TO service_role;

-- End of migration 067 (source only, not applied)
