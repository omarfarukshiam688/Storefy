-- Product Plan Limit Enforcement and Subscription-Tenant Plan Synchronization
-- Migration 057 (next after 056)
-- Dependencies: 001-056 already applied
--
-- This migration implements:
-- 1. subscription_product_retention table for downgrade retention selections
-- 2. sync_tenant_plan_on_subscription_change trigger to keep tenants.plan_id in sync
-- 3. enforce_product_limit_trigger to enforce published product limits at DB level
-- 4. Updated apply_subscription_downgrades() with retention selection support
-- 5. Updated approve_or_reject_payment() to sync tenant plan_id on upgrade approval
--
-- Locking strategy:
-- - Tenant-specific transaction-level advisory locks via public.tenant_advisory_lock_key(uuid)
-- - Each tenant's mutations serialize through its own advisory lock key.
-- - Tenant A and Tenant B can execute independent mutations concurrently.
-- - All product, subscription, payment, and downgrade mutations acquire the owning
--   tenant's advisory lock BEFORE any row-level locks.
-- - Multi-tenant operations acquire locks in deterministic ascending UUID order.
-- - No global advisory lock is used.
-- - Deadlock prevention: acquire all tenant locks in deterministic order before row locks.

-- =============================================================================
-- 1. Subscription Product Retention Table
-- =============================================================================
-- 
-- Referential integrity strategy:
-- - Add UNIQUE (tenant_id, id) on subscriptions and products to enable composite FKs
-- - subscription_product_retention uses composite FKs (tenant_id, subscription_id) and (tenant_id, product_id)
-- - This ensures a retention row cannot reference a subscription/product belonging to another tenant
-- - Existing PKs, FKs, uniqueness, and ON DELETE CASCADE behavior are preserved

-- Enable composite foreign keys by adding UNIQUE (tenant_id, id) on referenced tables
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_tenant_id_id_unique'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_tenant_id_id_unique unique (tenant_id, id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_tenant_id_id_unique'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_tenant_id_id_unique unique (tenant_id, id);
  end if;
end
$$;

create table if not exists public.subscription_product_retention (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null,
  downgrade_request_id uuid not null,
  product_id uuid not null,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint subscription_product_retention_unique unique (subscription_id, downgrade_request_id, product_id),
  -- Composite FKs enforce tenant ownership at database level (no TOCTOU race)
  constraint subscription_product_retention_subscription_fk
    foreign key (tenant_id, subscription_id)
    references public.subscriptions (tenant_id, id)
    on delete cascade,
  constraint subscription_product_retention_product_fk
    foreign key (tenant_id, product_id)
    references public.products (tenant_id, id)
    on delete cascade
);

create index if not exists idx_subscription_product_retention_subscription_id
  on public.subscription_product_retention (subscription_id);

create index if not exists idx_subscription_product_retention_downgrade_request_id
  on public.subscription_product_retention (downgrade_request_id);

create index if not exists idx_subscription_product_retention_tenant_id
  on public.subscription_product_retention (tenant_id);

-- RLS
alter table public.subscription_product_retention enable row level security;

drop policy if exists "Tenant admins can manage retention selections"
  on public.subscription_product_retention;
create policy "Tenant admins can manage retention selections"
  on public.subscription_product_retention for all to authenticated
  using (
    exists (
      select 1 from public.subscriptions s
      join public.tenants t on t.id = s.tenant_id
      where s.id = subscription_product_retention.subscription_id
        and public.is_tenant_admin(t.id)
    )
  )
  with check (
    exists (
      select 1 from public.subscriptions s
      join public.tenants t on t.id = s.tenant_id
      where s.id = subscription_product_retention.subscription_id
        and public.is_tenant_admin(t.id)
    )
  );

-- Service role needs full access for downgrade execution
grant select, insert, delete on public.subscription_product_retention to authenticated;
grant all on public.subscription_product_retention to service_role;

-- =============================================================================
-- 2. Helper Function: Consistent Advisory Lock Key Derivation
-- =============================================================================

create or replace function public.tenant_advisory_lock_key(p_tenant_id uuid)
returns bigint
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  -- Derive a deterministic signed 64-bit key from tenant UUID.
  -- Uses first 8 bytes of MD5 digest (decoded from hex), masked to signed 64-bit range.
  -- NOTE: Theoretical collision probability ~1/2^64 per tenant pair; acceptable for advisory locks.
  with digest as (
    select decode(md5(p_tenant_id::text), 'hex') as d
  )
  select (
    (get_byte(d, 0)::bigint << 56) |
    (get_byte(d, 1)::bigint << 48) |
    (get_byte(d, 2)::bigint << 40) |
    (get_byte(d, 3)::bigint << 32) |
    (get_byte(d, 4)::bigint << 24) |
    (get_byte(d, 5)::bigint << 16) |
    (get_byte(d, 6)::bigint << 8) |
    (get_byte(d, 7)::bigint)
  ) & 9223372036854775807
  from digest;
$$;

revoke execute on function public.tenant_advisory_lock_key(uuid) from public;
grant execute on function public.tenant_advisory_lock_key(uuid) to authenticated, service_role;

-- =============================================================================
-- 3. Trigger Function: Sync tenants.plan_id from subscriptions.plan_id
-- =============================================================================
--
-- These AFTER triggers run within the caller's transaction. Tenant-level
-- advisory locks are acquired by the calling RPC function BEFORE these
-- triggers fire, ensuring proper serialization. These triggers do NOT
-- acquire advisory locks themselves; they must not become an alternative
-- locking mechanism.

create or replace function public.sync_tenant_plan_on_subscription_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_active_subscription public.subscriptions%rowtype;
begin
  -- Only act on plan_id changes for active/meaningful subscription statuses
  if NEW.plan_id is distinct from OLD.plan_id then
    -- Find the current authoritative subscription for this tenant.
    -- The UPDATE has already completed, so NEW.plan_id is visible.
    -- Priority: active > trialing > past_due > suspended > canceled > expired
    -- Among same status, prefer the one with the latest current_period_end.
    select *
    into v_active_subscription
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
      set plan_id = v_active_subscription.plan_id,
          updated_at = now()
      where id = NEW.tenant_id
        and plan_id is distinct from v_active_subscription.plan_id;
    end if;
  end if;

  return NEW;
end;
$$;

revoke execute on function public.sync_tenant_plan_on_subscription_change() from public;
grant execute on function public.sync_tenant_plan_on_subscription_change() to authenticated, service_role;

-- Trigger on subscriptions.plan_id change (AFTER so NEW values are visible)
drop trigger if exists sync_tenant_plan_on_subscription_change on public.subscriptions;
create trigger sync_tenant_plan_on_subscription_change
  after update of plan_id on public.subscriptions
  for each row
  execute function public.sync_tenant_plan_on_subscription_change();

-- Also sync on subscription INSERT (for initial subscription creation)
create or replace function public.sync_tenant_plan_on_subscription_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_authoritative_subscription public.subscriptions%rowtype;
begin
  -- Find the current authoritative subscription for this tenant using
  -- the same priority logic as sync_tenant_plan_on_subscription_change().
  -- The INSERT has already completed, so the new row is visible.
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

drop trigger if exists sync_tenant_plan_on_subscription_insert on public.subscriptions;
create trigger sync_tenant_plan_on_subscription_insert
  after insert on public.subscriptions
  for each row
  execute function public.sync_tenant_plan_on_subscription_insert();

-- =============================================================================
-- 4. Trigger Function: Enforce Published Product Limit
-- =============================================================================
--
-- This BEFORE trigger runs within the caller's transaction. The tenant-level
-- advisory lock is acquired by the calling RPC function BEFORE this trigger
-- fires. The FOR SHARE on the subscription row coordinates with
-- apply_subscription_downgrades() which uses FOR UPDATE SKIP LOCKED.
-- The tenant advisory lock provides the primary serialization; the FOR SHARE
-- is a secondary coordination mechanism within the same tenant.

create or replace function public.enforce_product_limit_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_tenant_id uuid;
  v_plan_limit int;
  v_active_count int;
  v_subscription public.subscriptions%rowtype;
begin
  -- Only enforce on transitions INTO published state (is_active=true, is_archived=false)
  if NEW.is_active and not NEW.is_archived then
    -- Reject tenant_id changes on existing products (cross-tenant transfer not supported)
    -- This check MUST come before the early-return for already-published products
    -- to prevent bypassing the cross-tenant transfer restriction.
    if OLD is not null and NEW.tenant_id is distinct from OLD.tenant_id then
      raise exception 'CROSS_TENANT_TRANSFER_NOT_ALLOWED: Product tenant_id cannot be changed'
        using errcode = 'P0001';
    end if;

    -- If already was published, no net increase
    if OLD is not null and OLD.is_active and not OLD.is_archived then
      return NEW;
    end if;

    v_tenant_id := NEW.tenant_id;

    -- Find authoritative active subscription for this tenant and lock it FOR SHARE.
    -- This coordinates with apply_subscription_downgrades() which uses
    -- FOR UPDATE SKIP LOCKED on subscriptions. FOR SHARE conflicts with FOR UPDATE,
    -- so the downgrade worker will skip this subscription (retry later) rather than
    -- deadlocking. The trigger waits briefly for the downgrade worker's transaction
    -- to commit, then sees the new plan limit.
    select *
    into v_subscription
    from public.subscriptions
    where tenant_id = v_tenant_id
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
    limit 1
    for share;

    if not found then
      -- No subscription found, check tenant plan_id as fallback (for legacy/trial)
      select pl.product_limit
      into v_plan_limit
      from public.tenants t
      join public.plans pl on pl.id = t.plan_id
      where t.id = v_tenant_id;

      if not found then
        raise exception 'TENANT_OR_PLAN_NOT_FOUND: Cannot resolve plan for tenant'
          using errcode = 'P0001';
      end if;
    else
      select pl.product_limit
      into v_plan_limit
      from public.plans pl
      where pl.id = v_subscription.plan_id;

      if not found then
        raise exception 'PLAN_NOT_FOUND: Subscription references missing plan'
          using errcode = 'P0001';
      end if;
    end if;

    -- Unlimited plan (-1) bypasses limit
    if v_plan_limit = -1 then
      return NEW;
    end if;

    -- Count currently published products for this tenant
    select count(*)
    into v_active_count
    from public.products
    where tenant_id = v_tenant_id
      and is_active = true
      and is_archived = false;

    if v_active_count >= v_plan_limit then
      raise exception 'PRODUCT_LIMIT_EXCEEDED: Published product limit reached (limit: %)', v_plan_limit
        using errcode = 'P0001';
    end if;
  end if;

  return NEW;
end;
$$;

revoke execute on function public.enforce_product_limit_trigger() from public;
grant execute on function public.enforce_product_limit_trigger() to authenticated, service_role;

-- Trigger on products table
drop trigger if exists enforce_product_limit on public.products;
create trigger enforce_product_limit
  before insert or update on public.products
  for each row
  execute function public.enforce_product_limit_trigger();

-- =============================================================================
-- 5. Updated approve_or_reject_payment() - Sync tenant plan on upgrade approval
-- =============================================================================

create or replace function public.approve_or_reject_payment(
  p_payment_id uuid,
  p_decision text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_payment public.payments%rowtype;
  v_payment_tenant_id uuid;
  v_subscription public.subscriptions%rowtype;
  v_target_plan public.plans%rowtype;
  v_current_plan public.plans%rowtype;
  v_is_super_admin boolean;
  v_new_status text;
  v_audit_id uuid;
  v_result jsonb;

  v_allowed_purposes constant text[] := array[
    'subscription_initial',
    'subscription_renewal',
    'subscription_upgrade',
    'subscription_downgrade',
    'manual_topup',
    'refund'
  ];

  v_subscription_required_purposes constant text[] := array[
    'subscription_initial',
    'subscription_renewal',
    'subscription_upgrade',
    'subscription_downgrade'
  ];

begin
  -- 1. Verify Super Admin authorization
  select public.is_super_admin()
  into v_is_super_admin;

  if not v_is_super_admin then
    return jsonb_build_object(
      'success', false,
      'error', 'Super admin authorization required',
      'error_code', 'UNAUTHORIZED'
    );
  end if;

  -- 2. Validate decision parameter
  if p_decision not in ('approved', 'rejected') then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid decision. Must be "approved" or "rejected"',
      'error_code', 'INVALID_DECISION'
    );
  end if;

  -- 3. Resolve tenant ID from payment without acquiring a row lock.
  -- This initial lookup is NOT authoritative; the payment is re-validated
  -- after acquiring the tenant advisory lock.
  select tenant_id
  into v_payment_tenant_id
  from public.payments
  where id = p_payment_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Payment not found',
      'error_code', 'PAYMENT_NOT_FOUND'
    );
  end if;

  -- 4. Acquire tenant advisory lock BEFORE any row locks.
  perform pg_advisory_xact_lock(public.tenant_advisory_lock_key(v_payment_tenant_id));

  -- 5. Re-read and lock the payment row for update.
  -- The payment is re-validated under the tenant lock to prevent TOCTOU races.
  select *
  into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Payment not found',
      'error_code', 'PAYMENT_NOT_FOUND'
    );
  end if;

  -- 5. Validate subscription reference
  if v_payment.purpose = any(v_subscription_required_purposes) then
    if v_payment.subscription_id is null then
      return jsonb_build_object(
        'success', false,
        'error', 'Subscription reference required for purpose: ' || v_payment.purpose,
        'error_code', 'MISSING_SUBSCRIPTION'
      );
    end if;
  end if;

  -- 6. Idempotency
  if v_payment.status = 'completed' and p_decision = 'approved' then
    return jsonb_build_object(
      'success', true,
      'message', 'Payment already approved',
      'idempotent', true,
      'payment_id', p_payment_id,
      'status', v_payment.status
    );
  end if;

  if v_payment.status = 'failed' and p_decision = 'rejected' then
    return jsonb_build_object(
      'success', true,
      'message', 'Payment already rejected',
      'idempotent', true,
      'payment_id', p_payment_id,
      'status', v_payment.status
    );
  end if;

  -- 7. Verify payment is in verification_required state
  if v_payment.status <> 'verification_required' then
    return jsonb_build_object(
      'success', false,
      'error', 'Payment cannot be ' || p_decision || ' from status: ' || v_payment.status,
      'error_code', 'INVALID_STATUS_TRANSITION',
      'current_status', v_payment.status
    );
  end if;

  -- 8. Validate payment purpose
  if v_payment.purpose <> all(v_allowed_purposes) then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid payment purpose: ' || v_payment.purpose,
      'error_code', 'INVALID_PURPOSE'
    );
  end if;

  -- 9. Validate trusted subscription references before approval
  if p_decision = 'approved' and v_payment.subscription_id is not null then

    select *
    into v_subscription
    from public.subscriptions
    where id = v_payment.subscription_id
    for update;

    if not found then
      return jsonb_build_object(
        'success', false,
        'error', 'Subscription not found for payment',
        'error_code', 'SUBSCRIPTION_NOT_FOUND'
      );
    end if;

    if v_payment.tenant_id <> v_subscription.tenant_id then
      return jsonb_build_object(
        'success', false,
        'error', 'Payment tenant does not match subscription tenant',
        'error_code', 'TENANT_MISMATCH'
      );
    end if;

    -- 8a. Renewal validation
    if v_payment.purpose = 'subscription_renewal' then

      if v_payment.renewal_period_start is null
         or v_payment.renewal_period_end is null then
        return jsonb_build_object(
          'success', false,
          'error', 'Renewal payment requires trusted renewal_period_start and renewal_period_end',
          'error_code', 'MISSING_RENEWAL_PERIOD'
        );
      end if;

      if v_payment.renewal_period_start >= v_payment.renewal_period_end then
        return jsonb_build_object(
          'success', false,
          'error', 'Invalid renewal period reference',
          'error_code', 'INVALID_RENEWAL_PERIOD'
        );
      end if;

      if v_subscription.status not in (
        'active', 'trialing', 'past_due', 'canceled', 'expired'
      ) then
        return jsonb_build_object(
          'success', false,
          'error', 'Subscription cannot be renewed from status: ' || v_subscription.status,
          'error_code', 'INVALID_SUBSCRIPTION_STATE'
        );
      end if;

      if v_payment.renewal_period_start < v_subscription.current_period_end then
        return jsonb_build_object(
          'success', false,
          'error', 'Renewal payment period starts before current subscription billing period end',
          'error_code', 'RENEWAL_PERIOD_MISMATCH'
        );
      end if;

    -- 8b. Upgrade validation
    elsif v_payment.purpose = 'subscription_upgrade' then

      if v_subscription.status <> 'active' then
        return jsonb_build_object(
          'success', false,
          'error', 'Subscription cannot be upgraded from status: ' || v_subscription.status,
          'error_code', 'INVALID_SUBSCRIPTION_STATE'
        );
      end if;

      if v_payment.target_plan_id is null then
        return jsonb_build_object(
          'success', false,
          'error', 'Upgrade payment requires trusted target_plan_id',
          'error_code', 'MISSING_TARGET_PLAN'
        );
      end if;

      if v_payment.expected_amount is null then
        return jsonb_build_object(
          'success', false,
          'error', 'Upgrade payment requires trusted expected_amount',
          'error_code', 'MISSING_EXPECTED_AMOUNT'
        );
      end if;

      if v_subscription.scheduled_plan_id is null then
        return jsonb_build_object(
          'success', false,
          'error', 'Subscription has no scheduled plan for upgrade',
          'error_code', 'MISSING_SCHEDULED_PLAN'
        );
      end if;

      if v_payment.target_plan_id <> v_subscription.scheduled_plan_id then
        return jsonb_build_object(
          'success', false,
          'error', 'Upgrade payment target_plan_id does not match subscription scheduled_plan_id',
          'error_code', 'TARGET_PLAN_MISMATCH'
        );
      end if;

      select *
      into v_target_plan
      from public.plans
      where id = v_payment.target_plan_id;

      if not found then
        return jsonb_build_object(
          'success', false,
          'error', 'Target plan not found',
          'error_code', 'TARGET_PLAN_NOT_FOUND'
        );
      end if;

      if v_target_plan.is_active is distinct from true then
        return jsonb_build_object(
          'success', false,
          'error', 'Target plan is not active',
          'error_code', 'TARGET_PLAN_INACTIVE'
        );
      end if;

      if v_payment.currency <> 'BDT' then
        return jsonb_build_object(
          'success', false,
          'error', 'Upgrade payment currency must match target plan pricing currency',
          'error_code', 'CURRENCY_MISMATCH'
        );
      end if;

      if v_payment.amount <> v_payment.expected_amount then
        return jsonb_build_object(
          'success', false,
          'error', 'Upgrade payment amount must match trusted expected amount',
          'error_code', 'AMOUNT_MISMATCH'
        );
      end if;

    -- 8c. Downgrade validation
    elsif v_payment.purpose = 'subscription_downgrade' then

      if v_subscription.status <> 'active' then
        return jsonb_build_object(
          'success', false,
          'error', 'Subscription cannot be downgraded from status: ' || v_subscription.status,
          'error_code', 'INVALID_SUBSCRIPTION_STATE'
        );
      end if;

      if v_payment.target_plan_id is null then
        return jsonb_build_object(
          'success', false,
          'error', 'Downgrade payment requires target_plan_id',
          'error_code', 'MISSING_TARGET_PLAN'
        );
      end if;

      if v_subscription.scheduled_plan_id is null then
        return jsonb_build_object(
          'success', false,
          'error', 'Subscription has no scheduled downgrade plan',
          'error_code', 'MISSING_SCHEDULED_PLAN'
        );
      end if;

      if v_payment.target_plan_id <> v_subscription.scheduled_plan_id then
        return jsonb_build_object(
          'success', false,
          'error', 'Downgrade payment target_plan_id does not match subscription scheduled_plan_id',
          'error_code', 'TARGET_PLAN_MISMATCH'
        );
      end if;

      if v_subscription.scheduled_plan_change_at is null then
        return jsonb_build_object(
          'success', false,
          'error', 'Scheduled downgrade effective date is missing',
          'error_code', 'MISSING_SCHEDULED_CHANGE_DATE'
        );
      end if;

      if v_subscription.downgrade_request_id is null then
        return jsonb_build_object(
          'success', false,
          'error', 'Subscription downgrade request ID is missing',
          'error_code', 'MISSING_DOWNGRADE_REQUEST_ID'
        );
      end if;

      if v_payment.metadata->>'downgrade_request_id'
         is distinct from v_subscription.downgrade_request_id::text then
        return jsonb_build_object(
          'success', false,
          'error', 'Downgrade payment request ID does not match the current scheduled request',
          'error_code', 'DOWNGRADE_REQUEST_ID_MISMATCH'
        );
      end if;

      select *
      into v_target_plan
      from public.plans
      where id = v_payment.target_plan_id;

      if not found then
        return jsonb_build_object(
          'success', false,
          'error', 'Downgrade target plan not found',
          'error_code', 'TARGET_PLAN_NOT_FOUND'
        );
      end if;

      if v_target_plan.is_active is distinct from true then
        return jsonb_build_object(
          'success', false,
          'error', 'Downgrade target plan is not active',
          'error_code', 'TARGET_PLAN_INACTIVE'
        );
      end if;

      select *
      into v_current_plan
      from public.plans
      where id = v_subscription.plan_id;

      if not found then
        return jsonb_build_object(
          'success', false,
          'error', 'Current subscription plan not found',
          'error_code', 'CURRENT_PLAN_NOT_FOUND'
        );
      end if;

      if v_target_plan.price_monthly >= v_current_plan.price_monthly then
        return jsonb_build_object(
          'success', false,
          'error', 'Downgrade target plan must be cheaper than the current plan',
          'error_code', 'TARGET_PLAN_NOT_CHEAPER'
        );
      end if;

      if v_payment.amount is distinct from 0::numeric then
        return jsonb_build_object(
          'success', false,
          'error', 'Downgrade payment amount must be zero',
          'error_code', 'INVALID_DOWNGRADE_AMOUNT'
        );
      end if;

      if v_payment.expected_amount is not null then
        return jsonb_build_object(
          'success', false,
          'error', 'Downgrade payment expected_amount must be NULL',
          'error_code', 'UNEXPECTED_DOWNGRADE_EXPECTED_AMOUNT'
        );
      end if;

      if v_payment.currency is distinct from 'BDT' then
        return jsonb_build_object(
          'success', false,
          'error', 'Downgrade payment currency must be BDT',
          'error_code', 'CURRENCY_MISMATCH'
        );
      end if;

end if;
  end if;

  -- 9. On rejection, clear scheduled upgrade/downgrade only under the
  --    original matching rules. Preserve the existing behavior.
  -- The tenant advisory lock is already held at this point.
  if p_decision = 'rejected'
     and v_payment.purpose in ('subscription_upgrade', 'subscription_downgrade')
     and v_payment.subscription_id is not null then

    select *
    into v_subscription
    from public.subscriptions
    where id = v_payment.subscription_id
    for update;

    if not found then
      return jsonb_build_object(
        'success', false,
        'error', 'Subscription not found for payment',
        'error_code', 'SUBSCRIPTION_NOT_FOUND'
      );
    end if;

    if v_payment.tenant_id <> v_subscription.tenant_id then
      return jsonb_build_object(
        'success', false,
        'error', 'Payment tenant does not match subscription tenant',
        'error_code', 'TENANT_MISMATCH'
      );
    end if;

    if v_subscription.scheduled_plan_id = v_payment.target_plan_id then

      if v_payment.purpose = 'subscription_downgrade' then

        if v_subscription.downgrade_request_id is not null
           and v_payment.metadata->>'downgrade_request_id'
               = v_subscription.downgrade_request_id::text then

          update public.subscriptions
          set scheduled_plan_id = null,
              scheduled_plan_change_at = null,
              downgrade_request_id = null,
              updated_at = now()
          where id = v_payment.subscription_id;

          -- Clean up retention selections for this rejected downgrade request
          delete from public.subscription_product_retention
          where subscription_id = v_payment.subscription_id
            and downgrade_request_id = v_subscription.downgrade_request_id;
        end if;

      else

        update public.subscriptions
        set scheduled_plan_id = null,
            scheduled_plan_change_at = null,
            updated_at = now()
        where id = v_payment.subscription_id;

      end if;
    end if;
  end if;

  -- 10. Determine new payment status
  v_new_status := case p_decision
    when 'approved' then 'completed'
    when 'rejected' then 'failed'
  end;

  -- 11. Perform atomic payment status update
  update public.payments
  set status = v_new_status,
      verified_by = auth.uid(),
      verified_at = now(),
      verification_notes = p_reason,
      updated_at = now()
  where id = p_payment_id
    and status = 'verification_required';

  if not found then
    select status
    into v_payment.status
    from public.payments
    where id = p_payment_id;

    return jsonb_build_object(
      'success', true,
      'message', 'Payment already processed by concurrent request',
      'idempotent', true,
      'payment_id', p_payment_id,
      'status', v_payment.status
    );
  end if;

  -- 12. Handle subscription activation, renewal, upgrade, or downgrade
  if p_decision = 'approved' and v_payment.subscription_id is not null then

    if v_payment.purpose = 'subscription_initial'
       and v_subscription.status in ('trialing', 'past_due', 'canceled', 'expired') then

      update public.subscriptions
      set status = 'active',
          billing_cycle_anchor = coalesce(v_subscription.billing_cycle_anchor, now()),
          current_period_start = now(),
          current_period_end = now() + interval '1 month',
          trial_start = null,
          trial_end = null,
          grace_period_end = null,
          canceled_at = null,
          cancel_at_period_end = false,
          suspended_at = null,
          ended_at = null,
          updated_at = now()
      where id = v_payment.subscription_id;

    elsif v_payment.purpose = 'subscription_renewal'
       and v_subscription.status in ('active', 'trialing', 'past_due', 'canceled', 'expired') then

      update public.subscriptions
      set status = 'active',
          billing_cycle_anchor = coalesce(v_subscription.billing_cycle_anchor, v_payment.renewal_period_start),
          current_period_start = v_payment.renewal_period_start,
          current_period_end = v_payment.renewal_period_end,
          trial_start = null,
          trial_end = null,
          grace_period_end = null,
          canceled_at = null,
          cancel_at_period_end = false,
          suspended_at = null,
          ended_at = null,
          updated_at = now()
      where id = v_payment.subscription_id;

    elsif v_payment.purpose = 'subscription_upgrade'
       and v_subscription.status = 'active' then

      update public.subscriptions
      set plan_id = v_payment.target_plan_id,
          scheduled_plan_id = null,
          scheduled_plan_change_at = null,
          updated_at = now()
      where id = v_payment.subscription_id;

      -- The trigger sync_tenant_plan_on_subscription_change will fire and update tenants.plan_id

    elsif v_payment.purpose = 'subscription_downgrade'
       and v_subscription.status = 'active' then

      -- Approval confirms the scheduled downgrade payment.
      -- Do not change the current plan here.
      -- The downgrade worker applies the scheduled plan at its effective date.
      update public.subscriptions
      set updated_at = now()
      where id = v_payment.subscription_id;

    end if;
  end if;

  -- 13. Create immutable payment verification audit record
  insert into public.payment_verification_audit (
    payment_id,
    admin_user_id,
    decision,
    previous_status,
    new_status,
    reason
  )
  values (
    p_payment_id,
    auth.uid(),
    p_decision,
    'verification_required',
    v_new_status,
    p_reason
  )
  returning id into v_audit_id;

  -- 14. Return success
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Payment ' || p_decision,
    'idempotent', false,
    'payment_id', p_payment_id,
    'audit_id', v_audit_id,
    'previous_status', 'verification_required',
    'new_status', v_new_status,
    'subscription_id', v_payment.subscription_id
  );

  return v_result;

exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', 'Payment approval failed',
      'error_code', 'APPROVAL_ERROR'
    );
end;
$$;

-- Revoke from PUBLIC, anon, and authenticated; grant to authenticated and service_role
revoke execute on function public.approve_or_reject_payment(uuid, text, text) from public;
grant execute on function public.approve_or_reject_payment(uuid, text, text) to authenticated, service_role;

-- =============================================================================
-- 6. Updated apply_subscription_downgrades() with Retention Selection Support
-- =============================================================================

create or replace function public.apply_subscription_downgrades()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_result jsonb;
  v_applied integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_sub record;
  v_candidate record;
  v_target_plan public.plans%rowtype;
  v_payment public.payments%rowtype;
  v_payment_status text;
  v_payment_found boolean;
  v_payment_count integer;
  v_error_code text;
  v_error_message text;
  v_audit_id uuid;
  v_target_product_limit int;
  v_retained_product_ids uuid[];
  v_active_product_ids uuid[];
  v_products_to_unpublish uuid[];
  v_selection_valid boolean;
  v_tenant_ids uuid[];
  v_tenant_id uuid;
begin
  -- Identify candidate tenant IDs without row locks.
  select array_agg(distinct s.tenant_id order by s.tenant_id)
  into v_tenant_ids
  from public.subscriptions s
  where s.scheduled_plan_id is not null
    and s.scheduled_plan_change_at <= now()
    and s.status = 'active';

  if v_tenant_ids is null then
    return jsonb_build_object('success', true, 'applied', 0, 'errors', '[]'::jsonb);
  end if;

  -- Process each tenant. Tenant advisory locks are acquired in deterministic
  -- ascending UUID order before any row locks to prevent deadlocks.
  foreach v_tenant_id in array v_tenant_ids loop
    -- Acquire tenant advisory lock BEFORE any row locks for this tenant.
    perform pg_advisory_xact_lock(public.tenant_advisory_lock_key(v_tenant_id));

    -- Process each due subscription for this tenant.
    loop
      -- Find a candidate subscription for this tenant (no row lock yet)
      select s.id as subscription_id, s.tenant_id, s.plan_id as previous_plan_id,
             s.scheduled_plan_id as target_plan_id,
             s.scheduled_plan_change_at as scheduled_change_at,
             s.downgrade_request_id
      into v_candidate
      from public.subscriptions s
      where s.tenant_id = v_tenant_id
        and s.scheduled_plan_id is not null
        and s.scheduled_plan_change_at <= now()
        and s.status = 'active'
      order by s.scheduled_plan_change_at
      limit 1;

      if not found then
        exit; -- No more due subscriptions for this tenant
      end if;

      -- Now re-select with FOR UPDATE SKIP LOCKED to lock the row
      -- and verify it still matches our criteria.
      select s.id as subscription_id, s.tenant_id, s.plan_id as previous_plan_id,
             s.scheduled_plan_id as target_plan_id,
             s.scheduled_plan_change_at as scheduled_change_at,
             s.downgrade_request_id
      into v_sub
      from public.subscriptions s
      where s.id = v_candidate.subscription_id
        and s.scheduled_plan_id is not null
        and s.scheduled_plan_change_at <= now()
        and s.status = 'active'
      for update skip locked;

      if not found then
        -- Another worker got it or criteria changed; continue to next iteration
        continue;
      end if;

    -- Reset per-iteration error state
    v_error_code := null;
    v_error_message := null;
    v_selection_valid := false;

    -- Validate target plan still exists and is active
    select *
    into v_target_plan
    from public.plans
    where id = v_sub.target_plan_id;

    if not found then
      insert into public.subscription_change_audit (
        subscription_id, tenant_id, previous_plan_id, target_plan_id,
        scheduled_change_at, applied_at, event_type,
        error_code, error_message, metadata
      ) values (
        v_sub.subscription_id, v_sub.tenant_id, v_sub.previous_plan_id,
        v_sub.target_plan_id, v_sub.scheduled_change_at, now(),
        'downgrade_failed_target_deleted', 'TARGET_PLAN_DELETED',
        'Target plan no longer exists',
        jsonb_build_object(
          'previous_plan_id', v_sub.previous_plan_id,
          'target_plan_id', v_sub.target_plan_id,
          'scheduled_change_at', v_sub.scheduled_change_at,
          'downgrade_request_id', v_sub.downgrade_request_id
        )
      ) on conflict (subscription_id, target_plan_id, scheduled_change_at, event_type)
      do nothing;
      v_errors := v_errors || jsonb_build_array(
        jsonb_build_object(
          'subscription_id', v_sub.subscription_id,
          'tenant_id', v_sub.tenant_id,
          'event_type', 'downgrade_failed_target_deleted',
          'error_code', 'TARGET_PLAN_DELETED',
          'error_message', 'Target plan no longer exists'
        )
      );
      continue;
    end if;

    if v_target_plan.is_active is distinct from true then
      insert into public.subscription_change_audit (
        subscription_id, tenant_id, previous_plan_id, target_plan_id,
        scheduled_change_at, applied_at, event_type,
        error_code, error_message, metadata
      ) values (
        v_sub.subscription_id, v_sub.tenant_id, v_sub.previous_plan_id,
        v_sub.target_plan_id, v_sub.scheduled_change_at, now(),
        'downgrade_failed_inactive_target', 'TARGET_PLAN_INACTIVE',
        'Target plan is no longer active',
        jsonb_build_object(
          'previous_plan_id', v_sub.previous_plan_id,
          'target_plan_id', v_sub.target_plan_id,
          'scheduled_change_at', v_sub.scheduled_change_at,
          'downgrade_request_id', v_sub.downgrade_request_id
        )
      ) on conflict (subscription_id, target_plan_id, scheduled_change_at, event_type)
      do nothing;
      v_errors := v_errors || jsonb_build_array(
        jsonb_build_object(
          'subscription_id', v_sub.subscription_id,
          'tenant_id', v_sub.tenant_id,
          'event_type', 'downgrade_failed_inactive_target',
          'error_code', 'TARGET_PLAN_INACTIVE',
          'error_message', 'Target plan is no longer active'
        )
      );
      continue;
    end if;

    -- Re-verify the subscription still has this scheduled change
    if v_sub.target_plan_id is null then
      insert into public.subscription_change_audit (
        subscription_id, tenant_id, previous_plan_id, target_plan_id,
        scheduled_change_at, applied_at, event_type,
        error_code, error_message, metadata
      ) values (
        v_sub.subscription_id, v_sub.tenant_id, v_sub.previous_plan_id,
        v_sub.target_plan_id, v_sub.scheduled_change_at, now(),
        'downgrade_failed_concurrent_change', 'SCHEDULE_CLEARED',
        'Scheduled plan change was already cleared',
        jsonb_build_object(
          'previous_plan_id', v_sub.previous_plan_id,
          'target_plan_id', v_sub.target_plan_id,
          'scheduled_change_at', v_sub.scheduled_change_at,
          'downgrade_request_id', v_sub.downgrade_request_id
        )
      ) on conflict (subscription_id, target_plan_id, scheduled_change_at, event_type)
      do nothing;
      v_errors := v_errors || jsonb_build_array(
        jsonb_build_object(
          'subscription_id', v_sub.subscription_id,
          'tenant_id', v_sub.tenant_id,
          'event_type', 'downgrade_failed_concurrent_change',
          'error_code', 'SCHEDULE_CLEARED',
          'error_message', 'Scheduled plan change was already cleared'
        )
      );
      continue;
    end if;

    -- CRITICAL: Verify a corresponding downgrade payment has been approved.
    select count(*)
    into v_payment_count
    from public.payments p
    where p.subscription_id = v_sub.subscription_id
      and p.purpose = 'subscription_downgrade'
      and p.target_plan_id = v_sub.target_plan_id
      and p.status = 'completed'
      and p.metadata->>'downgrade_request_id' = v_sub.downgrade_request_id::text;

    if v_payment_count = 0 then
      select p.status
      into v_payment_status
      from public.payments p
      where p.subscription_id = v_sub.subscription_id
        and p.purpose = 'subscription_downgrade'
        and p.target_plan_id = v_sub.target_plan_id
        and p.metadata->>'downgrade_request_id' = v_sub.downgrade_request_id::text
        limit 1;

      v_payment_found := FOUND;

      IF NOT v_payment_found THEN
        insert into public.subscription_change_audit (
          subscription_id, tenant_id, previous_plan_id, target_plan_id,
          scheduled_change_at, applied_at, event_type,
          error_code, error_message, metadata
        ) values (
          v_sub.subscription_id, v_sub.tenant_id, v_sub.previous_plan_id,
          v_sub.target_plan_id, v_sub.scheduled_change_at, now(),
          'downgrade_failed_payment_missing', 'PAYMENT_MISSING',
          'No downgrade payment found for this subscription and target plan',
          jsonb_build_object(
            'previous_plan_id', v_sub.previous_plan_id,
            'target_plan_id', v_sub.target_plan_id,
            'scheduled_change_at', v_sub.scheduled_change_at,
            'downgrade_request_id', v_sub.downgrade_request_id
          )
        ) on conflict (subscription_id, target_plan_id, scheduled_change_at, event_type)
        do nothing;
      else
        if v_payment_status = 'verification_required' then
          insert into public.subscription_change_audit (
            subscription_id, tenant_id, previous_plan_id, target_plan_id,
            scheduled_change_at, applied_at, event_type,
            error_code, error_message, metadata
          ) values (
            v_sub.subscription_id, v_sub.tenant_id, v_sub.previous_plan_id,
            v_sub.target_plan_id, v_sub.scheduled_change_at, now(),
            'downgrade_failed_payment_pending', 'PAYMENT_NOT_APPROVED',
            'Downgrade payment is pending Super Admin verification',
            jsonb_build_object(
              'previous_plan_id', v_sub.previous_plan_id,
              'target_plan_id', v_sub.target_plan_id,
              'scheduled_change_at', v_sub.scheduled_change_at,
              'downgrade_request_id', v_sub.downgrade_request_id,
              'payment_status', v_payment_status
            )
          ) on conflict (subscription_id, target_plan_id, scheduled_change_at, event_type)
          do nothing;
        else
          insert into public.subscription_change_audit (
            subscription_id, tenant_id, previous_plan_id, target_plan_id,
            scheduled_change_at, applied_at, event_type,
            error_code, error_message, metadata
          ) values (
            v_sub.subscription_id, v_sub.tenant_id, v_sub.previous_plan_id,
            v_sub.target_plan_id, v_sub.scheduled_change_at, now(),
            'downgrade_failed_payment_rejected', 'PAYMENT_NOT_APPROVED',
            'Downgrade payment has not been approved (status: ' || v_payment_status || ')',
            jsonb_build_object(
              'previous_plan_id', v_sub.previous_plan_id,
              'target_plan_id', v_sub.target_plan_id,
              'scheduled_change_at', v_sub.scheduled_change_at,
              'downgrade_request_id', v_sub.downgrade_request_id,
              'payment_status', v_payment_status
            )
          ) on conflict (subscription_id, target_plan_id, scheduled_change_at, event_type)
          do nothing;
        end if;
      end if;
      IF NOT v_payment_found THEN
        v_errors := v_errors || jsonb_build_array(
          jsonb_build_object(
            'subscription_id', v_sub.subscription_id,
            'tenant_id', v_sub.tenant_id,
            'event_type', 'downgrade_failed_payment_missing',
            'error_code', 'PAYMENT_MISSING',
            'error_message', 'No downgrade payment found for this subscription and target plan'
          )
        );
      elsif v_payment_status = 'verification_required' then
        v_errors := v_errors || jsonb_build_array(
          jsonb_build_object(
            'subscription_id', v_sub.subscription_id,
            'tenant_id', v_sub.tenant_id,
            'event_type', 'downgrade_failed_payment_pending',
            'error_code', 'PAYMENT_NOT_APPROVED',
            'error_message', 'Downgrade payment is pending Super Admin verification'
          )
        );
      else
        v_errors := v_errors || jsonb_build_array(
          jsonb_build_object(
            'subscription_id', v_sub.subscription_id,
            'tenant_id', v_sub.tenant_id,
            'event_type', 'downgrade_failed_payment_rejected',
            'error_code', 'PAYMENT_NOT_APPROVED',
            'error_message',
              'Downgrade payment has not been approved (status: ' || v_payment_status || ')'
          )
        );
      end if;
      continue;
    end if;

    if v_payment_count > 1 then
      insert into public.subscription_change_audit (
        subscription_id, tenant_id, previous_plan_id, target_plan_id,
        scheduled_change_at, applied_at, event_type,
        error_code, error_message, metadata
      ) values (
        v_sub.subscription_id, v_sub.tenant_id, v_sub.previous_plan_id,
        v_sub.target_plan_id, v_sub.scheduled_change_at, now(),
        'downgrade_failed_payment_multiple', 'PAYMENT_MULTIPLE',
        'Multiple approved downgrade payments found for this subscription and target plan',
        jsonb_build_object(
          'previous_plan_id', v_sub.previous_plan_id,
          'target_plan_id', v_sub.target_plan_id,
          'scheduled_change_at', v_sub.scheduled_change_at,
          'downgrade_request_id', v_sub.downgrade_request_id,
          'payment_count', v_payment_count
        )
      ) on conflict (subscription_id, target_plan_id, scheduled_change_at, event_type)
      do nothing;
      v_errors := v_errors || jsonb_build_array(
        jsonb_build_object(
          'subscription_id', v_sub.subscription_id,
          'tenant_id', v_sub.tenant_id,
          'event_type', 'downgrade_failed_payment_multiple',
          'error_code', 'PAYMENT_MULTIPLE',
          'error_message', 'Multiple approved downgrade payments found for this subscription and target plan'
        )
      );
      continue;
    end if;

    -- Validate target plan's product_limit
    select product_limit
    into v_target_product_limit
    from public.plans
    where id = v_sub.target_plan_id;

    if v_target_product_limit = -1 then
      -- Unlimited plan, no retention/unpublishing needed
      v_selection_valid := true;
    else
      -- Check for valid retention selection for this downgrade request
      select array_agg(product_id order by created_at)
      into v_retained_product_ids
      from public.subscription_product_retention
      where subscription_id = v_sub.subscription_id
        and downgrade_request_id = v_sub.downgrade_request_id;

      if v_retained_product_ids is not null and array_length(v_retained_product_ids, 1) > 0 then
        -- Validate selection: all products must belong to tenant, be currently published,
        -- and count must not exceed target limit
        if array_length(v_retained_product_ids, 1) <= v_target_product_limit then
          select count(*) = array_length(v_retained_product_ids, 1)
          into v_selection_valid
          from public.products
          where id = any(v_retained_product_ids)
            and tenant_id = v_sub.tenant_id
            and is_active = true
            and is_archived = false;
        end if;
      end if;
    end if;

    -- Apply the downgrade atomically within this transaction
    update public.subscriptions
    set plan_id = v_sub.target_plan_id,
        scheduled_plan_id = null,
        scheduled_plan_change_at = null,
        downgrade_request_id = null,
        updated_at = now()
    where id = v_sub.subscription_id
      and scheduled_plan_id = v_sub.target_plan_id;

    if not found then
      insert into public.subscription_change_audit (
        subscription_id, tenant_id, previous_plan_id, target_plan_id,
        scheduled_change_at, applied_at, event_type,
        error_code, error_message, metadata
      ) values (
        v_sub.subscription_id, v_sub.tenant_id, v_sub.previous_plan_id,
        v_sub.target_plan_id, v_sub.scheduled_change_at, now(),
        'downgrade_failed_concurrent_change', 'SCHEDULE_CLEARED_CONCURRENT',
        'Scheduled plan change was cleared by another transaction',
        jsonb_build_object(
          'previous_plan_id', v_sub.previous_plan_id,
          'target_plan_id', v_sub.target_plan_id,
          'scheduled_change_at', v_sub.scheduled_change_at,
          'downgrade_request_id', v_sub.downgrade_request_id
        )
      ) on conflict (subscription_id, target_plan_id, scheduled_change_at, event_type)
      do nothing;
      v_errors := v_errors || jsonb_build_array(
        jsonb_build_object(
          'subscription_id', v_sub.subscription_id,
          'tenant_id', v_sub.tenant_id,
          'event_type', 'downgrade_failed_concurrent_change',
          'error_code', 'SCHEDULE_CLEARED_CONCURRENT',
          'error_message', 'Scheduled plan change was cleared by another transaction'
        )
      );
      continue;
    end if;

    -- Handle product retention/unpublishing if target plan has a limit
    if v_target_product_limit <> -1 then
      if v_selection_valid and v_retained_product_ids is not null then
        -- Explicit retention selection: unpublish all OTHER published products
        update public.products
        set is_active = false,
            updated_at = now()
        where tenant_id = v_sub.tenant_id
          and is_active = true
          and is_archived = false
          and id <> all(v_retained_product_ids);
      else
        -- Fallback: Newest First - retain newest published products up to limit
        -- Deterministic ordering: created_at DESC, id DESC (UUID tie-breaker)
        select array_agg(id order by created_at desc, id desc)
        into v_active_product_ids
        from public.products
        where tenant_id = v_sub.tenant_id
          and is_active = true
          and is_archived = false;

        if v_active_product_ids is not null and array_length(v_active_product_ids, 1) > v_target_product_limit then
          -- Unpublish older products beyond the limit
          v_products_to_unpublish := v_active_product_ids[v_target_product_limit + 1:];
          update public.products
          set is_active = false,
              updated_at = now()
          where id = any(v_products_to_unpublish);
        end if;
      end if;
    end if;

    -- Clean up retention selections for this completed downgrade
    delete from public.subscription_product_retention
    where subscription_id = v_sub.subscription_id
      and downgrade_request_id = v_sub.downgrade_request_id;

    -- Record successful application
    insert into public.subscription_change_audit (
      subscription_id, tenant_id, previous_plan_id, target_plan_id,
      scheduled_change_at, applied_at, event_type,
      metadata
    ) values (
      v_sub.subscription_id, v_sub.tenant_id, v_sub.previous_plan_id,
      v_sub.target_plan_id, v_sub.scheduled_change_at, now(),
      'downgrade_applied',
      jsonb_build_object(
        'previous_plan_id', v_sub.previous_plan_id,
        'target_plan_id', v_sub.target_plan_id,
        'scheduled_change_at', v_sub.scheduled_change_at,
        'downgrade_request_id', v_sub.downgrade_request_id
      )
    ) returning id into v_audit_id;

    v_applied := v_applied + 1;
  end loop;
end loop;

  v_result := jsonb_build_object(
    'success', true,
    'applied', v_applied,
    'errors', v_errors
  );

  return v_result;

exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', 'Downgrade execution failed',
      'error_code', 'DOWNGRADE_EXECUTION_ERROR'
    );
end;
$$;

-- Revoke from PUBLIC, anon, and authenticated; grant to service_role only.
revoke execute on function public.apply_subscription_downgrades() from public, anon, authenticated;
grant execute on function public.apply_subscription_downgrades() to service_role;

-- =============================================================================
-- 7. Updated Product RLS Policies - Require tenant_admin for mutations
-- =============================================================================

-- Drop existing policies
drop policy if exists "Tenant members can insert products" on public.products;
drop policy if exists "Tenant members can update their products" on public.products;
drop policy if exists "Tenant members can delete their products" on public.products;

-- Read access: tenant members (unchanged)
-- No change to "Tenant members can read their products"

-- INSERT: tenant_admin only
create policy "Tenant admins can insert products"
  on public.products for insert to authenticated
  with check (public.is_tenant_admin(tenant_id));

-- UPDATE: tenant_admin only
create policy "Tenant admins can update products"
  on public.products for update to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

-- DELETE: tenant_admin only
create policy "Tenant admins can delete products"
  on public.products for delete to authenticated
  using (public.is_tenant_admin(tenant_id));

-- Grants remain the same
-- grant select on public.products to authenticated;
-- grant all on public.products to service_role;

-- =============================================================================
-- 8. Transactional RPC: create_product
-- =============================================================================

create or replace function public.create_product(
  p_tenant_id uuid,
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_product public.products%rowtype;
  v_plan_limit int;
  v_active_count int;
  v_subscription public.subscriptions%rowtype;
  v_category_id uuid;
begin
  -- 1. Validate tenant exists
  if not exists (select 1 from public.tenants where id = p_tenant_id) then
    return jsonb_build_object(
      'success', false,
      'error', 'Tenant not found',
      'error_code', 'TENANT_NOT_FOUND'
    );
  end if;

  -- 2. Validate authorization (skip if auth.uid() is null, e.g. service_role caller)
  if auth.uid() is not null and not public.is_tenant_admin(p_tenant_id) then
    return jsonb_build_object(
      'success', false,
      'error', 'Tenant admin access required',
      'error_code', 'UNAUTHORIZED'
    );
  end if;

  -- 3. Acquire tenant advisory lock BEFORE any row locks
  perform pg_advisory_xact_lock(public.tenant_advisory_lock_key(p_tenant_id));

  -- 4. Validate category ownership
  v_category_id := nullif(p_input->>'category_id', '')::uuid;
  if v_category_id is not null then
    if not exists (
      select 1 from public.categories
      where id = v_category_id and tenant_id = p_tenant_id
    ) then
      return jsonb_build_object(
        'success', false,
        'error', 'Invalid category selected',
        'error_code', 'INVALID_CATEGORY'
      );
    end if;
  end if;

  -- 5. Check product limit (same logic as enforce_product_limit trigger)
  select *
  into v_subscription
  from public.subscriptions
  where tenant_id = p_tenant_id
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
    select pl.product_limit
    into v_plan_limit
    from public.plans pl
    where pl.id = v_subscription.plan_id;

    if not found then
      return jsonb_build_object(
        'success', false,
        'error', 'Subscription plan not found',
        'error_code', 'PLAN_NOT_FOUND'
      );
    end if;
  else
    -- Fallback to tenant plan_id
    select pl.product_limit
    into v_plan_limit
    from public.tenants t
    join public.plans pl on pl.id = t.plan_id
    where t.id = p_tenant_id;

    if not found then
      return jsonb_build_object(
        'success', false,
        'error', 'Tenant plan not found',
        'error_code', 'TENANT_OR_PLAN_NOT_FOUND'
      );
    end if;
  end if;

  if v_plan_limit <> -1 then
    select count(*)
    into v_active_count
    from public.products
    where tenant_id = p_tenant_id
      and is_active = true
      and is_archived = false;

    if v_active_count >= v_plan_limit then
      return jsonb_build_object(
        'success', false,
        'error', 'Product limit reached: your current plan allows up to ' || v_plan_limit || ' products.',
        'error_code', 'PRODUCT_LIMIT_EXCEEDED',
        'limit', v_plan_limit
      );
    end if;
  end if;

  -- 6. Insert product
  insert into public.products (
    tenant_id, name, slug, description, price, compare_at_price, cost_per_item,
    sku, category_id, is_active, is_featured, is_archived, metadata
  ) values (
    p_tenant_id,
    p_input->>'name',
    p_input->>'slug',
    p_input->>'description',
    (p_input->>'price')::numeric,
    nullif(p_input->>'compare_at_price', '')::numeric,
    nullif(p_input->>'cost_per_item', '')::numeric,
    p_input->>'sku',
    v_category_id,
    coalesce((p_input->>'is_active')::boolean, false),
    coalesce((p_input->>'is_featured')::boolean, false),
    coalesce((p_input->>'is_archived')::boolean, false),
    coalesce(p_input->'metadata', '{}'::jsonb)
  )
  returning *
  into v_product;

  return jsonb_build_object(
    'success', true,
    'product', row_to_json(v_product)
  );

exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', 'Failed to create product',
      'error_code', 'PRODUCT_CREATION_ERROR'
    );
end;
$$;

revoke execute on function public.create_product(uuid, jsonb) from public, anon;
grant execute on function public.create_product(uuid, jsonb) to authenticated, service_role;

-- =============================================================================
-- 9. Transactional RPC: update_product
-- =============================================================================

create or replace function public.update_product(
  p_tenant_id uuid,
  p_product_id uuid,
  p_input jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_product public.products%rowtype;
  v_category_id uuid;
begin
  -- 1. Validate authorization (skip if auth.uid() is null, e.g. service_role caller)
  if auth.uid() is not null and not public.is_tenant_admin(p_tenant_id) then
    return jsonb_build_object(
      'success', false,
      'error', 'Tenant admin access required',
      'error_code', 'UNAUTHORIZED'
    );
  end if;

  -- 2. Acquire tenant advisory lock BEFORE any row locks
  perform pg_advisory_xact_lock(public.tenant_advisory_lock_key(p_tenant_id));

  -- 3. Validate product ownership (re-read with row lock)
  select *
  into v_product
  from public.products
  where id = p_product_id
    and tenant_id = p_tenant_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Product not found',
      'error_code', 'PRODUCT_NOT_FOUND'
    );
  end if;

  -- 4. Validate category ownership if provided
  v_category_id := nullif(p_input->>'category_id', '')::uuid;
  if p_input ? 'category_id' and v_category_id is not null then
    if not exists (
      select 1 from public.categories
      where id = v_category_id and tenant_id = p_tenant_id
    ) then
      return jsonb_build_object(
        'success', false,
        'error', 'Invalid category selected',
        'error_code', 'INVALID_CATEGORY'
      );
    end if;
  end if;

  -- 5. Reject cross-tenant tenant_id changes
  if p_input ? 'tenant_id' and p_input->>'tenant_id' is not null
     and p_input->>'tenant_id' <> p_tenant_id::text then
    return jsonb_build_object(
      'success', false,
      'error', 'CROSS_TENANT_TRANSFER_NOT_ALLOWED: Product tenant_id cannot be changed',
      'error_code', 'P0001'
    );
  end if;

  -- 6. Update product (only fields present in input)
  update public.products
  set
    name = case when p_input ? 'name' then p_input->>'name' else name end,
    slug = case when p_input ? 'slug' then p_input->>'slug' else slug end,
    description = case when p_input ? 'description' then p_input->>'description' else description end,
    price = case when p_input ? 'price' then (p_input->>'price')::numeric else price end,
    compare_at_price = case when p_input ? 'compare_at_price' then nullif(p_input->>'compare_at_price', '')::numeric else compare_at_price end,
    cost_per_item = case when p_input ? 'cost_per_item' then nullif(p_input->>'cost_per_item', '')::numeric else cost_per_item end,
    sku = case when p_input ? 'sku' then p_input->>'sku' else sku end,
    category_id = case when p_input ? 'category_id' then nullif(p_input->>'category_id', '')::uuid else category_id end,
    is_active = case when p_input ? 'is_active' then (p_input->>'is_active')::boolean else is_active end,
    is_featured = case when p_input ? 'is_featured' then (p_input->>'is_featured')::boolean else is_featured end,
    is_archived = case when p_input ? 'is_archived' then (p_input->>'is_archived')::boolean else is_archived end,
    metadata = case when p_input ? 'metadata' then p_input->'metadata' else metadata end,
    updated_at = now()
  where id = p_product_id
    and tenant_id = p_tenant_id
  returning *
  into v_product;

  return jsonb_build_object(
    'success', true,
    'product', row_to_json(v_product)
  );

exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', 'Failed to update product',
      'error_code', 'PRODUCT_UPDATE_ERROR'
    );
end;
$$;

revoke execute on function public.update_product(uuid, uuid, jsonb) from public, anon;
grant execute on function public.update_product(uuid, uuid, jsonb) to authenticated, service_role;

-- =============================================================================
-- 10. Transactional RPC: delete_product
-- =============================================================================

create or replace function public.delete_product(
  p_tenant_id uuid,
  p_product_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_product public.products%rowtype;
begin
  -- 1. Validate authorization (skip if auth.uid() is null, e.g. service_role caller)
  if auth.uid() is not null and not public.is_tenant_admin(p_tenant_id) then
    return jsonb_build_object(
      'success', false,
      'error', 'Tenant admin access required',
      'error_code', 'UNAUTHORIZED'
    );
  end if;

  -- 2. Acquire tenant advisory lock BEFORE any row locks
  perform pg_advisory_xact_lock(public.tenant_advisory_lock_key(p_tenant_id));

  -- 3. Validate product ownership (re-read with row lock)
  select *
  into v_product
  from public.products
  where id = p_product_id
    and tenant_id = p_tenant_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Product not found',
      'error_code', 'PRODUCT_NOT_FOUND'
    );
  end if;

  -- 4. Delete product (CASCADE deletes related image records)
  delete from public.products
  where id = p_product_id
    and tenant_id = p_tenant_id;

  return jsonb_build_object(
    'success', true,
    'message', 'Product deleted',
    'product_id', p_product_id
  );

exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', 'Failed to delete product',
      'error_code', 'PRODUCT_DELETE_ERROR'
    );
end;
$$;

revoke execute on function public.delete_product(uuid, uuid) from public, anon;
grant execute on function public.delete_product(uuid, uuid) to authenticated, service_role;

-- =============================================================================
-- 11. Transactional RPC: create_subscription_renewal_payment
-- =============================================================================

create or replace function public.create_subscription_renewal_payment(
  p_tenant_id uuid,
  p_subscription_id uuid,
  p_amount numeric,
  p_expected_amount numeric,
  p_currency text,
  p_idempotency_key text,
  p_renewal_period_start timestamptz,
  p_renewal_period_end timestamptz,
  p_metadata jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_subscription public.subscriptions%rowtype;
  v_payment public.payments%rowtype;
  v_recovered public.payments%rowtype;
begin
  -- 1. Validate authorization (skip if auth.uid() is null, e.g. service_role caller)
  if auth.uid() is not null and not public.is_tenant_admin(p_tenant_id) then
    return jsonb_build_object(
      'success', false,
      'error', 'Tenant admin access required',
      'error_code', 'UNAUTHORIZED'
    );
  end if;

  -- 2. Acquire tenant advisory lock BEFORE any row locks
  perform pg_advisory_xact_lock(public.tenant_advisory_lock_key(p_tenant_id));

  -- 3. Validate subscription exists and belongs to tenant (re-read with row lock)
  select *
  into v_subscription
  from public.subscriptions
  where id = p_subscription_id
    and tenant_id = p_tenant_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Subscription not found',
      'error_code', 'SUBSCRIPTION_NOT_FOUND'
    );
  end if;

  -- 4. Insert renewal payment
  begin
    insert into public.payments (
      tenant_id,
      subscription_id,
      purpose,
      provider,
      amount,
      currency,
      status,
      idempotency_key,
      target_plan_id,
      expected_amount,
      renewal_period_start,
      renewal_period_end,
      metadata
    ) values (
      p_tenant_id,
      p_subscription_id,
      'subscription_renewal',
      'manual',
      p_amount,
      p_currency,
      'verification_required',
      p_idempotency_key,
      null,
      p_expected_amount,
      p_renewal_period_start,
      p_renewal_period_end,
      p_metadata
    )
    returning * into v_payment;

    return jsonb_build_object(
      'success', true,
      'idempotent', false,
      'payment_id', v_payment.id,
      'status', v_payment.status,
      'amount', v_payment.amount,
      'expected_amount', v_payment.expected_amount,
      'currency', v_payment.currency,
      'purpose', v_payment.purpose,
      'created_at', v_payment.created_at
    );
  exception
    when unique_violation then
      -- Idempotency key or unique constraint collision; try to recover existing payment
      select *
      into v_recovered
      from public.payments
      where subscription_id = p_subscription_id
        and purpose = 'subscription_renewal'
        and renewal_period_end = p_renewal_period_end
      limit 1;

      if found then
        return jsonb_build_object(
          'success', true,
          'idempotent', true,
          'payment_id', v_recovered.id,
          'status', v_recovered.status,
          'amount', v_recovered.amount,
          'expected_amount', v_recovered.expected_amount,
          'currency', v_recovered.currency,
          'purpose', v_recovered.purpose,
          'created_at', v_recovered.created_at
        );
      end if;

      return jsonb_build_object(
        'success', false,
        'error', 'Failed to create renewal payment',
        'error_code', 'PAYMENT_CREATION_ERROR'
      );
  end;
end;
$$;

revoke execute on function public.create_subscription_renewal_payment(uuid, uuid, numeric, numeric, text, text, timestamptz, timestamptz, jsonb) from public, anon;
grant execute on function public.create_subscription_renewal_payment(uuid, uuid, numeric, numeric, text, text, timestamptz, timestamptz, jsonb) to authenticated, service_role;

-- =============================================================================
-- 12. Updated create_subscription_upgrade_payment - Tenant-level locking
-- =============================================================================

create or replace function public.create_subscription_upgrade_payment(
  p_subscription_id uuid,
  p_target_plan_id uuid,
  p_amount numeric,
  p_expected_amount numeric,
  p_currency text,
  p_idempotency_key text,
  p_metadata jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_subscription public.subscriptions%rowtype;
  v_tenant_id uuid;
  v_current_plan public.plans%rowtype;
  v_target_plan public.plans%rowtype;
  v_payment public.payments%rowtype;
begin
  -- 1. Resolve tenant_id without row lock
  select tenant_id into v_tenant_id
  from public.subscriptions
  where id = p_subscription_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Subscription not found',
      'error_code', 'SUBSCRIPTION_NOT_FOUND'
    );
  end if;

  -- 2. Acquire tenant advisory lock BEFORE any row locks
  perform pg_advisory_xact_lock(public.tenant_advisory_lock_key(v_tenant_id));

  -- 3. Lock subscription row and validate state
  select *
  into v_subscription
  from public.subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Subscription not found',
      'error_code', 'SUBSCRIPTION_NOT_FOUND'
    );
  end if;

  if v_subscription.status <> 'active' then
    return jsonb_build_object(
      'success', false,
      'error', 'Subscription cannot be upgraded from status: ' || v_subscription.status,
      'error_code', 'INVALID_SUBSCRIPTION_STATE'
    );
  end if;

  if v_subscription.scheduled_plan_id is not null then
    return jsonb_build_object(
      'success', false,
      'error', 'A plan change is already scheduled for this subscription',
      'error_code', 'PLAN_CHANGE_ALREADY_SCHEDULED'
    );
  end if;

  -- 4. Validate current plan
  select *
  into v_current_plan
  from public.plans
  where id = v_subscription.plan_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Current plan not found',
      'error_code', 'CURRENT_PLAN_NOT_FOUND'
    );
  end if;

  if v_current_plan.is_active is distinct from true then
    return jsonb_build_object(
      'success', false,
      'error', 'Current plan is not active',
      'error_code', 'CURRENT_PLAN_INACTIVE'
    );
  end if;

  -- 5. Validate target plan
  select *
  into v_target_plan
  from public.plans
  where id = p_target_plan_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Target plan not found',
      'error_code', 'TARGET_PLAN_NOT_FOUND'
    );
  end if;

  if v_target_plan.is_active is distinct from true then
    return jsonb_build_object(
      'success', false,
      'error', 'Target plan is not active',
      'error_code', 'TARGET_PLAN_INACTIVE'
    );
  end if;

  if v_target_plan.id = v_current_plan.id then
    return jsonb_build_object(
      'success', false,
      'error', 'Already subscribed to the target plan',
      'error_code', 'SAME_PLAN'
    );
  end if;

  if v_target_plan.price_monthly <= v_current_plan.price_monthly then
    return jsonb_build_object(
      'success', false,
      'error', 'Upgrade target must have a higher monthly price than the current plan',
      'error_code', 'INVALID_UPGRADE_TRANSITION'
    );
  end if;

  -- 6. Atomic update + insert (single transaction, PL/pgSQL is atomic)
  update public.subscriptions
  set scheduled_plan_id = p_target_plan_id,
      scheduled_plan_change_at = v_subscription.current_period_end,
      updated_at = now()
  where id = p_subscription_id
    and scheduled_plan_id is null;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'A plan change was scheduled by a concurrent request',
      'error_code', 'PLAN_CHANGE_ALREADY_SCHEDULED'
    );
  end if;

  insert into public.payments (
    tenant_id,
    subscription_id,
    purpose,
    provider,
    amount,
    currency,
    status,
    idempotency_key,
    target_plan_id,
    expected_amount,
    renewal_period_start,
    renewal_period_end,
    metadata
  ) values (
    v_subscription.tenant_id,
    p_subscription_id,
    'subscription_upgrade',
    'manual',
    p_amount,
    p_currency,
    'verification_required',
    p_idempotency_key,
    p_target_plan_id,
    p_expected_amount,
    null,
    null,
    p_metadata
  )
  returning * into v_payment;

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'payment_id', v_payment.id,
    'status', v_payment.status,
    'amount', v_payment.amount,
    'expected_amount', v_payment.expected_amount,
    'currency', v_payment.currency,
    'purpose', v_payment.purpose,
    'target_plan_id', v_payment.target_plan_id,
    'created_at', v_payment.created_at
  );

exception
  when unique_violation then
    return jsonb_build_object(
      'success', false,
      'error', 'Duplicate payment request',
      'error_code', 'IDEMPOTENCY_CONFLICT'
    );
  when others then
    return jsonb_build_object(
      'success', false,
      'error', 'Payment creation failed',
      'error_code', 'PAYMENT_CREATION_ERROR'
    );
end;
$$;

-- Revoke from PUBLIC, anon, and authenticated; grant to service_role only.
revoke execute on function public.create_subscription_upgrade_payment(uuid, uuid, numeric, numeric, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_subscription_upgrade_payment(uuid, uuid, numeric, numeric, text, text, jsonb) to service_role;

-- =============================================================================
-- 13. Updated create_subscription_downgrade_payment - Tenant-level locking
-- =============================================================================

create or replace function public.create_subscription_downgrade_payment(
  p_subscription_id uuid,
  p_target_plan_id uuid,
  p_amount numeric,
  p_expected_amount numeric,
  p_currency text,
  p_idempotency_key text,
  p_metadata jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_subscription public.subscriptions%rowtype;
  v_tenant_id uuid;
  v_current_plan public.plans%rowtype;
  v_target_plan public.plans%rowtype;
  v_downgrade_request_id uuid;
  v_payment public.payments%rowtype;
begin
  -- 1. Resolve tenant_id without row lock
  select tenant_id into v_tenant_id
  from public.subscriptions
  where id = p_subscription_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Subscription not found',
      'error_code', 'SUBSCRIPTION_NOT_FOUND'
    );
  end if;

  -- 2. Acquire tenant advisory lock BEFORE any row locks
  perform pg_advisory_xact_lock(public.tenant_advisory_lock_key(v_tenant_id));

  -- 3. Lock subscription row and validate state
  select *
  into v_subscription
  from public.subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Subscription not found',
      'error_code', 'SUBSCRIPTION_NOT_FOUND'
    );
  end if;

  if v_subscription.status <> 'active' then
    return jsonb_build_object(
      'success', false,
      'error', 'Subscription cannot be downgraded from status: ' || v_subscription.status,
      'error_code', 'INVALID_SUBSCRIPTION_STATE'
    );
  end if;

  if v_subscription.scheduled_plan_id is not null then
    return jsonb_build_object(
      'success', false,
      'error', 'A plan change is already scheduled for this subscription',
      'error_code', 'PLAN_CHANGE_ALREADY_SCHEDULED'
    );
  end if;

  -- 4. Validate current plan
  select *
  into v_current_plan
  from public.plans
  where id = v_subscription.plan_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Current plan not found',
      'error_code', 'CURRENT_PLAN_NOT_FOUND'
    );
  end if;

  if v_current_plan.is_active is distinct from true then
    return jsonb_build_object(
      'success', false,
      'error', 'Current plan is not active',
      'error_code', 'CURRENT_PLAN_INACTIVE'
    );
  end if;

  -- 5. Validate target plan
  select *
  into v_target_plan
  from public.plans
  where id = p_target_plan_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Target plan not found',
      'error_code', 'TARGET_PLAN_NOT_FOUND'
    );
  end if;

  if v_target_plan.is_active is distinct from true then
    return jsonb_build_object(
      'success', false,
      'error', 'Target plan is not active',
      'error_code', 'TARGET_PLAN_INACTIVE'
    );
  end if;

  if v_target_plan.id = v_current_plan.id then
    return jsonb_build_object(
      'success', false,
      'error', 'Already subscribed to the target plan',
      'error_code', 'SAME_PLAN'
    );
  end if;

  if v_target_plan.price_monthly >= v_current_plan.price_monthly then
    return jsonb_build_object(
      'success', false,
      'error', 'Downgrade target must have a lower monthly price than the current plan',
      'error_code', 'INVALID_DOWNGRADE_TRANSITION'
    );
  end if;

  -- 5b. Enforce financial invariants for downgrade payments
  if p_amount IS DISTINCT FROM 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'Downgrade payment amount must be 0',
      'error_code', 'INVALID_DOWNGRADE_AMOUNT'
    );
  end if;

  if p_expected_amount IS NOT NULL then
    return jsonb_build_object(
      'success', false,
      'error', 'Downgrade payment expected_amount must be null',
      'error_code', 'INVALID_DOWNGRADE_EXPECTED_AMOUNT'
    );
  end if;

  if p_currency IS DISTINCT FROM 'BDT' then
    return jsonb_build_object(
      'success', false,
      'error', 'Downgrade payment currency must be BDT',
      'error_code', 'INVALID_DOWNGRADE_CURRENCY'
    );
  end if;

  if p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' then
    return jsonb_build_object(
      'success', false,
      'error', 'Idempotency key must not be null, empty, or whitespace',
      'error_code', 'INVALID_IDEMPOTENCY_KEY'
    );
  end if;

  if p_metadata IS NULL OR jsonb_typeof(p_metadata) <> 'object' then
    return jsonb_build_object(
      'success', false,
      'error', 'Payment metadata must be a non-null JSON object',
      'error_code', 'INVALID_METADATA'
    );
  end if;

  if v_subscription.current_period_end is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Subscription must have a valid current_period_end',
      'error_code', 'INVALID_BILLING_PERIOD'
    );
  end if;

  if v_subscription.current_period_end <= now() then
    return jsonb_build_object(
      'success', false,
      'error', 'Cannot schedule downgrade for expired billing period',
      'error_code', 'EXPIRED_BILLING_PERIOD'
    );
  end if;

  -- 6. Generate unique downgrade_request_id
  v_downgrade_request_id := gen_random_uuid();

  declare
    v_actual_idempotency_key text;
    v_error_sqlstate text;
    v_error_constraint text;
  begin
    if p_idempotency_key like '%:new' then
      v_actual_idempotency_key := regexp_replace(p_idempotency_key, ':new$', ':req:' || v_downgrade_request_id);
    else
      v_actual_idempotency_key := p_idempotency_key;
    end if;

    -- 7. Atomic update + insert (single transaction, PL/pgSQL is atomic)
    update public.subscriptions
    set scheduled_plan_id = p_target_plan_id,
        scheduled_plan_change_at = v_subscription.current_period_end,
        downgrade_request_id = v_downgrade_request_id,
        updated_at = now()
    where id = p_subscription_id
      and scheduled_plan_id is null;

    if not found then
      return jsonb_build_object(
        'success', false,
        'error', 'A plan change was scheduled by a concurrent request',
        'error_code', 'PLAN_CHANGE_ALREADY_SCHEDULED'
      );
    end if;

    insert into public.payments (
      tenant_id,
      subscription_id,
      purpose,
      provider,
      amount,
      currency,
      status,
      idempotency_key,
      target_plan_id,
      expected_amount,
      renewal_period_start,
      renewal_period_end,
      metadata
    ) values (
      v_subscription.tenant_id,
      p_subscription_id,
      'subscription_downgrade',
      'manual',
      0,
      'BDT',
      'verification_required',
      v_actual_idempotency_key,
      p_target_plan_id,
      null,
      null,
      null,
      p_metadata || jsonb_build_object('downgrade_request_id', v_downgrade_request_id::text)
    )
    returning * into v_payment;

    return jsonb_build_object(
      'success', true,
      'idempotent', false,
      'payment_id', v_payment.id,
      'status', v_payment.status,
      'amount', v_payment.amount,
      'expected_amount', v_payment.expected_amount,
      'currency', v_payment.currency,
      'purpose', v_payment.purpose,
      'target_plan_id', v_payment.target_plan_id,
      'created_at', v_payment.created_at,
      'downgrade_request_id', v_downgrade_request_id::text,
      'idempotency_key', v_actual_idempotency_key
    );

  exception
    when unique_violation then
      return jsonb_build_object(
        'success', false,
        'error', 'Duplicate payment request',
        'error_code', 'IDEMPOTENCY_CONFLICT'
      );
    when others then
      get stacked diagnostics
        v_error_sqlstate = returned_sqlstate,
        v_error_constraint = constraint_name;

      raise warning
        'create_subscription_downgrade_payment failed; SQLSTATE=%; constraint=%',
        v_error_sqlstate,
        nullif(v_error_constraint, '');

      return jsonb_build_object(
        'success', false,
        'error', 'Payment creation failed',
        'error_code', 'PAYMENT_CREATION_ERROR'
      );
  end;
end;
$$;

-- Revoke from PUBLIC, anon, and authenticated; grant to service_role only.
revoke execute on function public.create_subscription_downgrade_payment(uuid, uuid, numeric, numeric, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_subscription_downgrade_payment(uuid, uuid, numeric, numeric, text, text, jsonb) to service_role;