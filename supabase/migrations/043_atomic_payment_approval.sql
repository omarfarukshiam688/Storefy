-- Atomic, idempotent payment approval/rejection by Super Admin
-- Requirements:
-- 1. Only Super Admin can call
-- 2. Payment must be in 'verification_required' status
-- 3. Atomic status transition with audit record
-- 4. Idempotent: repeated calls with same decision return same result
-- 5. Subscription activation/renewal happens exactly once
-- 6. Uses row-level locking to prevent concurrent approval race conditions
-- 7. Validates payment.tenant_id = subscription.tenant_id (FAIL CLOSED)
-- 8. Validates payment purpose against allowed values
-- 9. Safe error handling without exposing internal details

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

  -- 4. Idempotency: check current status
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

  -- 5. Verify payment is in verification_required state
  if v_payment.status <> 'verification_required' then
    return jsonb_build_object(
      'success', false,
      'error', 'Payment cannot be ' || p_decision || ' from status: ' || v_payment.status,
      'error_code', 'INVALID_STATUS_TRANSITION',
      'current_status', v_payment.status
    );
  end if;

  -- 6. Validate payment purpose
  if v_payment.purpose <> all(v_allowed_purposes) then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid payment purpose: ' || v_payment.purpose,
      'error_code', 'INVALID_PURPOSE'
    );
  end if;

  -- 7. Determine new status
  v_new_status := case p_decision
    when 'approved' then 'completed'
    when 'rejected' then 'failed'
  end;

  -- 8. Perform atomic status update
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

  -- 9. If approved, handle subscription activation/renewal
  if p_decision = 'approved' and v_payment.subscription_id is not null then
    -- Lock subscription row
    select *
    into v_subscription
    from public.subscriptions
    where id = v_payment.subscription_id
    for update;

    if not found then
      -- Subscription not found - this is a data integrity violation
      -- Roll back the payment status update and abort
      raise exception 'Subscription not found for payment: %', v_payment.subscription_id
        using errcode = 'P0001';
    end if;

    -- Validate tenant consistency - FAIL CLOSED
    if v_payment.tenant_id <> v_subscription.tenant_id then
      -- This is a critical data integrity violation
      -- Roll back everything and abort
      raise exception 'Payment tenant_id (%) does not match subscription tenant_id (%)',
        v_payment.tenant_id, v_subscription.tenant_id
        using errcode = 'P0001';
    end if;

    -- Activate or renew subscription based on purpose and current status
    if v_payment.purpose in ('subscription_initial', 'subscription_renewal')
       and v_subscription.status in ('trialing', 'past_due', 'canceled', 'expired') then
      
      -- Calculate period start/end
      -- For initial: start from now; for renewal: extend from GREATEST(current_period_end, now)
      -- This prevents creating periods in the past for overdue subscriptions
      declare
        v_period_start timestamptz;
        v_period_end timestamptz;
      begin
        if v_payment.purpose = 'subscription_initial' then
          v_period_start := now();
          v_period_end := now() + interval '1 month';
        else
          -- subscription_renewal: extend from max(current_period_end, now) to avoid past periods
          v_period_start := greatest(v_subscription.current_period_end, now());
          v_period_end := v_period_start + interval '1 month';
        end if;

        update public.subscriptions
        set status = 'active',
            billing_cycle_anchor = coalesce(v_subscription.billing_cycle_anchor, v_period_start),
            current_period_start = v_period_start,
            current_period_end = v_period_end,
            trial_start = null,
            trial_end = null,
            grace_period_end = null,
            canceled_at = null,
            cancel_at_period_end = false,
            suspended_at = null,
            ended_at = null,
            updated_at = now()
        where id = v_payment.subscription_id;
      end;

    elsif v_payment.purpose = 'subscription_upgrade' and v_subscription.status = 'active' then
      -- Upgrade takes effect at next billing cycle (scheduled change)
      -- The scheduled_plan_id and scheduled_plan_change_at should already be set
      -- Here we just confirm the upgrade payment succeeded
      update public.subscriptions
      set updated_at = now()
      where id = v_payment.subscription_id;

    elsif v_payment.purpose = 'subscription_downgrade' and v_subscription.status = 'active' then
      -- Downgrade scheduled for next billing date - payment confirms intent
      update public.subscriptions
      set updated_at = now()
      where id = v_payment.subscription_id;

    -- manual_topup and refund don't change subscription status
    end if;
  end if;

  -- 10. Create immutable audit record (in same transaction)
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

  -- 11. Return success with details
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