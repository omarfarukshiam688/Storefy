-- Fix subscription INSERT synchronization to use canonical authoritative selection
-- Migration 058 (next after 057)
-- Dependencies: 001-057 already applied
--
-- Problem: sync_tenant_plan_on_subscription_insert() blindly synchronizes NEW.plan_id
-- to tenants.plan_id without checking if an existing higher-priority subscription
-- should remain authoritative.
--
-- Fix: Make INSERT trigger use the same priority-based authoritative selection
-- logic as the UPDATE trigger (sync_tenant_plan_on_subscription_change).
--
-- The canonical priority order (from UPDATE trigger):
--   active > trialing > past_due > suspended > canceled > expired
-- Tie-breaker: current_period_end DESC
--
-- This migration replaces the INSERT trigger function only. The UPDATE trigger
-- function (sync_tenant_plan_on_subscription_change) is unchanged as it already
-- implements the correct logic.
--
-- Migration 057 is NOT modified.

-- =============================================================================
-- Replace INSERT trigger function with canonical authoritative selection
-- =============================================================================

create or replace function public.sync_tenant_plan_on_subscription_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lock_key bigint;
  v_authoritative_subscription public.subscriptions%rowtype;
begin
  -- Acquire tenant advisory lock to serialize with product limit trigger
  -- and UPDATE synchronization path
  v_lock_key := public.tenant_advisory_lock_key(NEW.tenant_id);
  perform pg_advisory_xact_lock(v_lock_key);

  -- Find the current authoritative subscription for this tenant using
  -- the same priority logic as sync_tenant_plan_on_subscription_change().
  -- Priority: active > trialing > past_due > suspended > canceled > expired
  -- Among same status, prefer the one with the latest current_period_end.
  select *
  into v_authoritative_subscription
  from public.subscriptions
  where tenant_id = NEW.tenant_id
    and status in ('active', 'trialing', 'past_due', 'suspended', 'canceled', 'expired')
  order by
    case status
      when 'active' then 1
      when 'trialing' then 2
      when 'past_due' then 3
      when 'suspended' then 4
      when 'canceled' then 5
      when 'expired' then 6
      else 7
    end,
    current_period_end desc
  limit 1;

  if found then
    update public.tenants
    set plan_id = v_authoritative_subscription.plan_id,
        updated_at = now()
    where id = NEW.tenant_id
      and plan_id is distinct from v_authoritative_subscription.plan_id;
  end if;
  -- If no eligible subscription exists, do not modify tenants.plan_id.
  -- The existing plan_id (if any) remains, or NULL if never set.
  -- This matches the UPDATE trigger behavior (which also only acts when found).

  return NEW;
end;
$$;

revoke execute on function public.sync_tenant_plan_on_subscription_insert() from public;
grant execute on function public.sync_tenant_plan_on_subscription_insert() to authenticated, service_role;

-- Trigger remains the same (after insert on subscriptions)
-- No need to drop/recreate trigger since function signature unchanged.