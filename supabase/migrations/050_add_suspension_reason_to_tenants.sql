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
--   null          → active tenant
--   'subscription_expiry' → suspended due to non-payment / subscription expiry
--   'administrative'      → manually disabled by Super Admin
--
-- Backfill strategy: Historical tenant records with is_active = false are
-- backfilled as 'administrative' (fail closed — no billing access unless
-- explicitly reclassified). No ambiguous historical record is granted the
-- subscription-suspension exception.
--
-- Migration number: 050 (next after 049)
-- Dependencies: 037-049 already applied
-- Rollback: Drop the column (historical reason data would be lost, but no
-- subscriptions or payments are affected).

alter table public.tenants
  add column if not exists suspension_reason text
    check (suspension_reason is null or suspension_reason in ('subscription_expiry', 'administrative'));

-- Backfill: tenants that are inactive but were never classified get 'administrative'
-- (fail closed — they will not get billing access unless explicitly reclassified).
update public.tenants
  set suspension_reason = 'administrative',
      updated_at = now()
  where is_active = false
    and suspension_reason is null;

-- Index for efficient queries by suspension reason
create index if not exists idx_tenants_suspension_reason
  on public.tenants (suspension_reason)
  where suspension_reason is not null;
