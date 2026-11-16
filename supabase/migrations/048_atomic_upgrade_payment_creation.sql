-- Atomic subscription upgrade payment creation
-- Migration 048 (does NOT modify migrations 037-047)
--
-- Provides a single SECURITY DEFINER RPC that atomically:
--   1. Validates the subscription (active, no scheduled plan change)
--   2. Validates the target plan (active, higher-priced)
--   3. Sets scheduled_plan_id / scheduled_plan_change_at
--   4. Inserts a verification_required payment with trusted fields
-- All in one database transaction; any failure rolls back everything.
--
-- Security:
--   SECURITY DEFINER with explicit search_path
--   Revoked from PUBLIC, anon, and authenticated; granted to service_role only
--   Tenant authorization is enforced by the application API (lib/subscriptions/payments.ts)
--     before calling this RPC via createServiceClient().
--   The RPC does NOT independently validate auth.uid() or tenant membership.
--   Pricing and proration are calculated by the trusted server-side application;
--   the RPC accepts them as input parameters.

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
  v_current_plan public.plans%rowtype;
  v_target_plan public.plans%rowtype;
  v_payment public.payments%rowtype;
begin
  -- 1. Lock subscription row and validate state
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

  -- 2. Validate current plan
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

  -- 3. Validate target plan
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

  -- 4. Atomic update + insert (single transaction, PL/pgSQL is atomic)
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
    -- Idempotency key collision from a concurrent request
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
-- The application calls this RPC via createServiceClient() after enforcing
-- tenant authorization in the API layer. The RPC itself performs no auth.uid()
-- or tenant-membership check, so it must not be callable by authenticated users.
revoke execute on function public.create_subscription_upgrade_payment(uuid, uuid, numeric, numeric, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_subscription_upgrade_payment(uuid, uuid, numeric, numeric, text, text, jsonb) to service_role;
