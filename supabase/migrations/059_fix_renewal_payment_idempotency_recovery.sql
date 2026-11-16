-- =============================================================================
-- Migration 059: Fix create_subscription_renewal_payment idempotency recovery
-- =============================================================================
-- Dependencies: 001-058 already applied
--
-- Problem: The unique_violation exception handler in
-- public.create_subscription_renewal_payment() recovered an existing payment
-- using only subscription_id, purpose, and renewal_period_end. This meant a
-- concurrent request with different tenant_id, amount, currency, or
-- idempotency_key could be incorrectly returned as idempotent success.
--
-- Fix: Replace the weak recovery query with strict attribute matching. Only
-- return an existing payment as idempotent when ALL request attributes match.
-- Unmatched unique constraint conflicts return IDEMPOTENCY_CONFLICT.
--
-- Migration 057 and 058 are NOT modified.
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
      -- Strict idempotency recovery: only return an existing payment as idempotent
      -- when ALL request attributes match. Otherwise return IDEMPOTENCY_CONFLICT.
      select *
      into v_recovered
      from public.payments
      where tenant_id = p_tenant_id
        and subscription_id = p_subscription_id
        and purpose = 'subscription_renewal'
        and provider = 'manual'
        and idempotency_key = p_idempotency_key
        and amount = p_amount
        and expected_amount = p_expected_amount
        and currency = p_currency
        and renewal_period_start = p_renewal_period_start
        and renewal_period_end = p_renewal_period_end
        and metadata = p_metadata
        and target_plan_id is null
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
        'error', 'Idempotency key conflict with different request attributes',
        'error_code', 'IDEMPOTENCY_CONFLICT'
      );
  end;
end;
$$;

revoke execute on function public.create_subscription_renewal_payment(uuid, uuid, numeric, numeric, text, text, timestamptz, timestamptz, jsonb) from public, anon;
grant execute on function public.create_subscription_renewal_payment(uuid, uuid, numeric, numeric, text, text, timestamptz, timestamptz, jsonb) to authenticated, service_role;
