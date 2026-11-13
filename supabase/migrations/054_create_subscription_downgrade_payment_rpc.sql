-- Atomic subscription downgrade payment creation
-- Migration 054 (next after 053)
-- Dependencies: 037-053 already applied
--
-- Provides a single SECURITY DEFINER RPC that atomically:
--   1. Validates the subscription (active, no scheduled plan change)
--   2. Validates the target plan (active, lower-priced)
--   3. Generates a unique downgrade_request_id
--   4. Sets scheduled_plan_id / scheduled_plan_change_at / downgrade_request_id
--   5. Inserts a verification_required payment with trusted fields
-- All in one database transaction; any failure rolls back everything.
--
-- Security:
--   SECURITY DEFINER with explicit search_path
--   Revoked from PUBLIC, anon, and authenticated; granted to service_role only
--   Tenant authorization is enforced by the application API before calling
--     this RPC via createServiceClient().
--   The RPC does NOT independently validate auth.uid() or tenant membership.
--   Pricing and proration are calculated by the trusted server-side application;
--   the RPC accepts them as input parameters.
--
-- Downgrade rules:
--   - Target plan must be active and lower-priced than current plan
--   - Only one scheduled change per subscription at a time
--   - Payment amount is always 0 (no immediate charge for downgrade)
--   - Expected amount is null (downgrades don't carry expected_amount)
--   - Downgrade takes effect at scheduled_plan_change_at (next billing date)
--
-- Deployment: Apply manually via Supabase Dashboard SQL Editor.
-- Rollback: Drop the function; update application code to use non-atomic path.

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
  v_current_plan public.plans%rowtype;
  v_target_plan public.plans%rowtype;
  v_downgrade_request_id uuid;
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

  if v_target_plan.price_monthly >= v_current_plan.price_monthly then
    return jsonb_build_object(
      'success', false,
      'error', 'Downgrade target must have a lower monthly price than the current plan',
      'error_code', 'INVALID_DOWNGRADE_TRANSITION'
    );
  end if;

  -- 3b. Enforce financial invariants for downgrade payments
  -- Amount must be exactly 0 (reject NULL and any non-zero value)
  if p_amount IS DISTINCT FROM 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'Downgrade payment amount must be 0',
      'error_code', 'INVALID_DOWNGRADE_AMOUNT'
    );
  end if;

  -- Expected amount must be NULL
  if p_expected_amount IS NOT NULL then
    return jsonb_build_object(
      'success', false,
      'error', 'Downgrade payment expected_amount must be null',
      'error_code', 'INVALID_DOWNGRADE_EXPECTED_AMOUNT'
    );
  end if;

  -- Currency must be exactly 'BDT' (reject NULL and any other value)
  if p_currency IS DISTINCT FROM 'BDT' then
    return jsonb_build_object(
      'success', false,
      'error', 'Downgrade payment currency must be BDT',
      'error_code', 'INVALID_DOWNGRADE_CURRENCY'
    );
  end if;

  -- Idempotency key must not be NULL, empty, or whitespace-only
  if p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' then
    return jsonb_build_object(
      'success', false,
      'error', 'Idempotency key must not be null, empty, or whitespace',
      'error_code', 'INVALID_IDEMPOTENCY_KEY'
    );
  end if;

  -- p_metadata must be a non-NULL JSON object
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

  -- 4. Generate unique downgrade_request_id
  v_downgrade_request_id := gen_random_uuid();

  -- 4b. Construct deterministic idempotency key for the payment.
  -- For new requests (base key ending in ':new'), replace ':new' with ':req:{request_id}'.
  -- For retry/existing request keys, use as-is.
  -- This ensures the payment's idempotency key can be reconstructed from the request_id.
  declare
    v_actual_idempotency_key text;
  begin
    if p_idempotency_key like '%:new' then
      v_actual_idempotency_key := regexp_replace(p_idempotency_key, ':new$', ':req:' || v_downgrade_request_id);
    else
      v_actual_idempotency_key := p_idempotency_key;
    end if;

    -- 5. Atomic update + insert (single transaction, PL/pgSQL is atomic)
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
revoke execute on function public.create_subscription_downgrade_payment(uuid, uuid, numeric, numeric, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_subscription_downgrade_payment(uuid, uuid, numeric, numeric, text, text, jsonb) to service_role;