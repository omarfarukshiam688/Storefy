-- Fix subscription renewal, upgrade, and payment validation logic in approve_or_reject_payment()
-- Database-level protections added in this migration (046 not yet applied):
-- 1. Renewal: require trusted, deterministic payment-bound billing-period reference; reject missing/ambiguous
--    references; lock subscription before validating/extending; prevent duplicate extension of the same period.
--    Overdue/catch-up behavior is preserved only when the future trusted server-side payment creation flow sets
--    renewal_period_* per existing policy (renewal starts at greatest(subscription.current_period_end, creation_time)).
--    Approval-time now() is not used in stored-period equality checks so delayed manual verification remains valid.
-- 2. Upgrade: bind payment to trusted target_plan_id and trusted server-calculated expected_amount (prorated per
--    accepted policy), require match with subscription scheduled_plan_id, validate target plan active status and
--    currency/amount against trusted expected amount, apply immediately, preserve billing anchor/dates/usage.
-- 3. Validation: require valid subscription_id for subscription-related payment purposes.
-- IMPORTANT: repository currently has no confirmed trusted server-side payment creation/approval API/UI flow.
-- The database cannot establish trust in client-supplied values. A future trusted server-side flow must calculate
-- and populate renewal_period_start/end and upgrade target_plan_id/expected_amount correctly.

-- Trusted payment references (idempotent; 037-045 already applied and are not modified)
alter table public.payments
  add column if not exists renewal_period_start timestamptz,
  add column if not exists renewal_period_end timestamptz,
  add column if not exists target_plan_id uuid references public.plans (id) on delete restrict,
  add column if not exists expected_amount numeric(12,2);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payments_renewal_period_pair_check'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_renewal_period_pair_check
      check (
        (renewal_period_start is null and renewal_period_end is null)
        or (renewal_period_start is not null and renewal_period_end is not null and renewal_period_start < renewal_period_end)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'payments_expected_amount_non_negative_check'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_expected_amount_non_negative_check
      check (expected_amount is null or expected_amount >= 0);
  end if;
end $$;

-- Prevent two distinct renewal payments from extending the same subscription for the same billing period.
-- Applies to renewal payments with a trusted period reference regardless of current status.
create unique index if not exists idx_payments_subscription_renewal_period_unique
  on public.payments (subscription_id, renewal_period_end)
  where purpose = 'subscription_renewal'
    and subscription_id is not null
    and renewal_period_end is not null;

create or replace function public.approve_or_reject_payment(
  p_payment_id uuid,
  p_decision text,  -- 'approved' or 'rejected'
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_payment public.payments%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_target_plan public.plans%rowtype;
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
  -- 1. Verify Super Admin authorization (uses auth.uid() of caller)
  select public.is_super_admin() into v_is_super_admin;
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

  -- 3. Lock the payment row for update to prevent concurrent approvals
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

  -- 4. Validate subscription reference for subscription-related purposes
  if v_payment.purpose = any(v_subscription_required_purposes) then
    if v_payment.subscription_id is null then
      return jsonb_build_object(
        'success', false,
        'error', 'Subscription reference required for purpose: ' || v_payment.purpose,
        'error_code', 'MISSING_SUBSCRIPTION'
      );
    end if;
  end if;

  -- 5. Idempotency: check current status (per-payment)
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

  -- 6. Verify payment is in verification_required state
  if v_payment.status <> 'verification_required' then
    return jsonb_build_object(
      'success', false,
      'error', 'Payment cannot be ' || p_decision || ' from status: ' || v_payment.status,
      'error_code', 'INVALID_STATUS_TRANSITION',
      'current_status', v_payment.status
    );
  end if;

  -- 7. Validate payment purpose
  if v_payment.purpose <> all(v_allowed_purposes) then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid payment purpose: ' || v_payment.purpose,
      'error_code', 'INVALID_PURPOSE'
    );
  end if;

  -- 8. Validate trusted renewal/upgrade references before mutating payment state.
  --    For approved subscription-affecting payments, lock subscription and fail closed on mismatch.
  if p_decision = 'approved' and v_payment.subscription_id is not null then
    -- Lock subscription row
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

    -- Validate tenant consistency - FAIL CLOSED
    if v_payment.tenant_id <> v_subscription.tenant_id then
      return jsonb_build_object(
        'success', false,
        'error', 'Payment tenant does not match subscription tenant',
        'error_code', 'TENANT_MISMATCH'
      );
    end if;

    if v_payment.purpose = 'subscription_renewal' then
      -- Renewal requires an explicit trusted, deterministic billing-period reference; reject missing/ambiguous references.
      -- No approval-time now() comparison is used so delayed manual verification of a correctly created payment remains valid.
      if v_payment.renewal_period_start is null or v_payment.renewal_period_end is null then
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

      if v_subscription.status not in ('active', 'trialing', 'past_due', 'canceled', 'expired') then
        return jsonb_build_object(
          'success', false,
          'error', 'Subscription cannot be renewed from status: ' || v_subscription.status,
          'error_code', 'INVALID_SUBSCRIPTION_STATE'
        );
      end if;

      -- Deterministic payment-bound period: must extend from or after the locked subscription's current period end.
      -- This preserves continuity (start == current_period_end) and trusted overdue/catch-up periods set at creation
      -- (start >= current_period_end), without recomputing an approval-time now() boundary.
      -- Trusted server-side creation must set renewal_period_* per existing policy, including catch-up-from-now when overdue.
      if v_payment.renewal_period_start < v_subscription.current_period_end then
        return jsonb_build_object(
          'success', false,
          'error', 'Renewal payment period starts before current subscription billing period end',
          'error_code', 'RENEWAL_PERIOD_MISMATCH'
        );
      end if;

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

      -- Validate actual payment against trusted payment-bound expected amount (server-calculated prorated amount).
      -- Do not compare prorated upgrade payments to full target monthly price; next renewal charges full new plan price.
      if v_payment.amount <> v_payment.expected_amount then
        return jsonb_build_object(
          'success', false,
          'error', 'Upgrade payment amount must match trusted expected amount',
          'error_code', 'AMOUNT_MISMATCH'
        );
      end if;
    end if;
  end if;

  -- 9. Determine new status
  v_new_status := case p_decision
    when 'approved' then 'completed'
    when 'rejected' then 'failed'
  end;

  -- 10. Perform atomic status update
  update public.payments
  set status = v_new_status,
      verified_by = auth.uid(),
      verified_at = now(),
      verification_notes = p_reason,
      updated_at = now()
  where id = p_payment_id
    and status = 'verification_required';

  if not found then
    -- Concurrent request already processed it - fetch current state and return idempotent result
    select status into v_payment.status
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

  -- 11. If approved, handle subscription activation/renewal/upgrade/downgrade
  if p_decision = 'approved' and v_payment.subscription_id is not null then
    -- Subscription already locked and validated above for renewal/upgrade paths.

    -- Handle subscription changes based on payment purpose
    if v_payment.purpose = 'subscription_initial'
       and v_subscription.status in ('trialing', 'past_due', 'canceled', 'expired') then
      
      -- Initial subscription activation: start billing from now
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
      
      -- Renewal: extend by the trusted, deterministic payment-bound billing period only.
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

    elsif v_payment.purpose = 'subscription_upgrade' and v_subscription.status = 'active' then
      -- Upgrade: apply validated target plan immediately; preserve billing anchor/dates/usage.
      update public.subscriptions
      set plan_id = v_payment.target_plan_id,
          scheduled_plan_id = null,
          scheduled_plan_change_at = null,
          updated_at = now()
      where id = v_payment.subscription_id;

    elsif v_payment.purpose = 'subscription_downgrade' and v_subscription.status = 'active' then
      -- Downgrade: scheduled for next billing date - payment confirms intent
      -- The downgrade will be applied at scheduled_plan_change_at via cron
      -- Here we just confirm the payment succeeded
      update public.subscriptions
      set updated_at = now()
      where id = v_payment.subscription_id;

    -- manual_topup and refund don't change subscription status
    end if;
  end if;

  -- 12. Create immutable audit record (in same transaction)
  insert into public.payment_verification_audit (
    payment_id,
    admin_user_id,
    decision,
    previous_status,
    new_status,
    reason
  ) values (
    p_payment_id,
    auth.uid(),
    p_decision,
    'verification_required',
    v_new_status,
    p_reason
  )
  returning id into v_audit_id;

  -- 13. Return success with details
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
    -- Log the error but don't expose internal details
    return jsonb_build_object(
      'success', false,
      'error', 'Payment approval failed',
      'error_code', 'APPROVAL_ERROR'
    );
end;
$$;

-- Revoke from public, grant to authenticated and service_role
revoke execute on function public.approve_or_reject_payment(uuid, text, text) from public;
grant execute on function public.approve_or_reject_payment(uuid, text, text) to authenticated, service_role;