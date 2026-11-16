-- Migration 069: Secure reserve_storage_quota permissions
-- Corrective migration applied AFTER migrations 060, 061, 062, 063, 064, 065, 066, 067, and 068.
--
-- Problem: public.reserve_storage_quota(uuid, text, text, text, bigint, text, text, bigint, interval)
-- has EXECUTE privileges granted to anon and authenticated roles, which should be restricted
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
ON FUNCTION public.reserve_storage_quota(uuid, text, text, text, bigint, text, text, bigint, interval)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.reserve_storage_quota(uuid, text, text, text, bigint, text, text, bigint, interval)
FROM anon;

REVOKE EXECUTE
ON FUNCTION public.reserve_storage_quota(uuid, text, text, text, bigint, text, text, bigint, interval)
FROM authenticated;

GRANT EXECUTE
ON FUNCTION public.reserve_storage_quota(uuid, text, text, text, bigint, text, text, bigint, interval)
TO service_role;

-- End of migration 069 (source only, not applied)
