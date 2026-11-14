-- Add suspension_reason to tenants table to distinguish subscription-related
-- suspension from administrative deactivation.
--
-- Problem: The previous inference logic treated any tenant with
-- is_active === false and subscription status in (suspended, expired, past_due)
-- as subscription-suspended, granting them billing/reactivation access. This
-- is ambiguous: an administratively disabled tenant could also have an expired
-- subscription and would incorrectly qualify.
--
-- Fix: Add an explicit suspension_reason column to public.tenants.
--   NULL                  → no explicit suspension classification;
--                           may represent an active tenant or a historical
--                           inactive tenant whose suspension reason is unknown
--   'subscription_expiry' → suspended due to non-payment / subscription expiry
--   'administrative'      → manually disabled by Super Admin
--
-- Backfill strategy: No automatic backfill. Historical inactive tenants keep
-- NULL suspension_reason (unknown reason). This preserves accurate history and
-- avoids misclassification. Super Admins must explicitly classify any tenant
-- needing billing access as 'subscription_expiry'.
--
-- Migration number: 050 (next after 049)
-- Dependencies: 037-049 already applied
-- Rollback: Drop the column (historical reason data would be lost, but no
-- subscriptions or payments are affected).

alter table public.tenants
  add column if not exists suspension_reason text
    check (suspension_reason is null or suspension_reason in ('subscription_expiry', 'administrative'));

-- Historical inactive tenants keep NULL suspension_reason (unknown reason).
-- This preserves accurate history: unknown reasons stay unknown.
-- Application logic treats NULL as "not subscription-suspended" (fail closed).
-- Both NULL and 'administrative' deny the inactive-tenant billing exception.
-- Super Admins must explicitly classify qualifying tenants as 'subscription_expiry'.

-- Index for efficient queries by suspension reason
create index if not exists idx_tenants_suspension_reason
  on public.tenants (suspension_reason)
  where suspension_reason is not null;
