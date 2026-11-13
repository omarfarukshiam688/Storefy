-- Diagnostic query: Identify tenants potentially misclassified by Migration 050
--
-- Migration 050 backfills ALL inactive tenants (is_active = false) as
-- suspension_reason = 'administrative' (fail closed). This means tenants who
-- were previously eligible for Billing/reactivation because their subscription
-- had expired/suspended may now be incorrectly classified as administratively
-- disabled and denied Billing access.
--
-- This query identifies tenants that are:
--   1. Inactive (is_active = false)
--   2. Classified as 'administrative' after Migration 050 backfill
--   3. Have a subscription with status suggesting subscription-related
--      suspension (suspended, expired, or past_due)
--
-- These tenants require MANUAL REVIEW. A Super Admin must determine whether
-- each should be reclassified as suspension_reason = 'subscription_expiry'
-- (granting Billing/reactivation access) or remain as 'administrative'
-- (blocked from Billing).
--
-- This query is READ-ONLY. It does not modify any data.
--
-- Deployment: Run manually in Supabase Dashboard SQL Editor.
-- No migration-history changes, no data mutations.

select
  t.id as tenant_id,
  t.name as tenant_name,
  t.slug as tenant_slug,
  t.is_active,
  t.suspension_reason,
  s.id as subscription_id,
  s.status as subscription_status,
  s.current_period_end,
  s.grace_period_end,
  s.scheduled_plan_id,
  p.name as current_plan_name,
  p.price_monthly as current_plan_price,
  (select count(*) from public.payments py where py.subscription_id = s.id) as payment_count
from public.tenants t
inner join public.subscriptions s on s.tenant_id = t.id
inner join public.plans p on p.id = s.plan_id
where t.is_active = false
  and t.suspension_reason = 'administrative'
  and s.status in ('suspended', 'expired', 'past_due')
order by t.name, s.current_period_end desc;

-- Additional context: Tenants that are inactive, classified as 'administrative',
-- but have NO subscription at all (truly administratively disabled, no payment
-- history — safe to leave as 'administrative').
select
  t.id as tenant_id,
  t.name as tenant_name,
  t.slug as tenant_slug,
  t.is_active,
  t.suspension_reason
from public.tenants t
left join public.subscriptions s on s.tenant_id = t.id
where t.is_active = false
  and t.suspension_reason = 'administrative'
  and s.id is null
order by t.name;

-- Additional context: Inactive tenants with an ACTIVE subscription (truly
-- administratively disabled while subscription is still valid — these should
-- remain 'administrative' and NOT receive Billing access).
select
  t.id as tenant_id,
  t.name as tenant_name,
  t.slug as tenant_slug,
  t.is_active,
  t.suspension_reason,
  s.id as subscription_id,
  s.status as subscription_status
from public.tenants t
inner join public.subscriptions s on s.tenant_id = t.id
where t.is_active = false
  and t.suspension_reason = 'administrative'
  and s.status = 'active'
order by t.name;
