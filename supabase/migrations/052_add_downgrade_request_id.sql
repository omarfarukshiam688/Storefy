-- Add downgrade_request_id to subscriptions table for reliable payment-scheduling correlation
-- Migration 052 (next after 051)
-- Dependencies: 037-051 already applied
--
-- Problem:
--   apply_subscription_downgrades() matches payments to scheduled downgrades using
--   metadata->>'effective_at' = scheduled_change_at::timestamptz. This text/timestamp
--   comparison is fragile: if a downgrade is cleared and recreated during the same
--   billing period, current_period_end (and thus scheduled_change_at) may remain
--   unchanged, allowing an old completed payment to authorize a new downgrade request.
--
-- Fix:
--   1. Add downgrade_request_id (uuid) column to public.subscriptions.
--   2. createDowngradePayment() generates a UUID per request, persists it on both
--      the subscription and the payment metadata.
--   3. apply_subscription_downgrades() matches payments using
--      metadata->>'downgrade_request_id' = subscriptions.downgrade_request_id
--         instead of effective_at timestamps.
--   4. approve_or_reject_payment() clears downgrade_request_id on rejection ONLY when
--      the payment's request ID matches the subscription's current request ID.
--   5. apply_subscription_downgrades() clears downgrade_request_id on successful
--      application.
--
-- Security:
--   Column is nullable UUID; no FK constraint (self-generated, not referencing another table).
--   All function security postures (SECURITY DEFINER, search_path, grants) unchanged.
--
-- Deployment: Apply manually via Supabase Dashboard SQL Editor.
-- Rollback: Drop the column; all dependent RPCs must be updated first.

-- 1. Add downgrade_request_id column
alter table public.subscriptions
  add column if not exists downgrade_request_id uuid;

-- Index for RPC lookups
create index if not exists idx_subscriptions_downgrade_request_id
  on public.subscriptions (downgrade_request_id)
  where downgrade_request_id is not null;

-- 2. Update apply_subscription_downgrades() to match payments by downgrade_request_id
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
  v_target_plan public.plans%rowtype;
  v_payment public.payments%rowtype;
  v_payment_status text;
  v_payment_count integer;
  v_error_code text;
  v_error_message text;
  v_audit_id uuid;
begin
  for v_sub in
    select s.id as subscription_id, s.tenant_id, s.plan_id as previous_plan_id,
           s.scheduled_plan_id as target_plan_id,
           s.scheduled_change_at as scheduled_change_at,
           s.downgrade_request_id
    from public.subscriptions s
    where s.scheduled_plan_id is not null
      and s.scheduled_change_at <= now()
      and s.status = 'active'
    for update skip locked
  loop
    v_error_code := null;
    v_error_message := null;

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
          'scheduled_change_at', v_sub.scheduled_change_at
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
          'scheduled_change_at', v_sub.scheduled_change_at
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
          'scheduled_change_at', v_sub.scheduled_change_at
        )
      );
      continue;
    end if;

    -- CRITICAL: Verify a corresponding downgrade payment has been approved.
    -- Match by downgrade_request_id (immutable per scheduling request) instead of
    -- effective_at timestamp, which can repeat across billing periods.
    select count(*)
    into v_payment_count
    from public.payments p
    where p.subscription_id = v_sub.subscription_id
      and p.purpose = 'subscription_downgrade'
      and p.target_plan_id = v_sub.target_plan_id
      and p.status = 'completed'
      and p.metadata->>'downgrade_request_id' = v_sub.downgrade_request_id::text;

    if v_payment_count = 0 then
      -- Determine the specific reason for the missing approval
      select p.status
      into v_payment_status
      from public.payments p
      where p.subscription_id = v_sub.subscription_id
        and p.purpose = 'subscription_downgrade'
        and p.target_plan_id = v_sub.target_plan_id
        and p.metadata->>'downgrade_request_id' = v_sub.downgrade_request_id::text
        limit 1;

      if not found then
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
        );
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
          );
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
          );
        end if;
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
      );
      continue;
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
      );
      continue;
    end if;

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

-- 3. Update approve_or_reject_payment() to clear downgrade_request_id on rejection
--    ONLY when the payment's request ID matches the subscription's current request ID.
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
  v_subscription public.subscriptions%rowtype;
  v_target_plan public.plans%rowtype;
  v_is_super_admin boolean;
  v_new_status text;
  v_audit_id uuid;
  v_result jsonb;
  v_allowed_purposes constant text[] := array[
    'subscription_initial', 'subscription_renewal', 'subscription_upgrade',
    'subscription_downgrade', 'manual_topup', 'refund'
  ];
  v_subscription_required_purposes constant text[] := array[
    'subscription_initial', 'subscription_renewal', 'subscription_upgrade',
    'subscription_downgrade'
  ];
begin
  -- 1. Verify Super Admin authorization
  select public.is_super_admin() into v_is_super_admin;
  if not v_is_super_admin then
    return jsonb_build_object(
      'success', false, 'error', 'Super admin authorization required',
      'error_code', 'UNAUTHORIZED'
    );
  end if;

  -- 2. Validate decision parameter
  if p_decision not in ('approved', 'rejected') then
    return jsonb_build_object(
      'success', false, 'error', 'Invalid decision. Must be "approved" or "rejected"',
      'error_code', 'INVALID_DECISION'
    );
  end if;

  -- 3. Lock the payment row for update
  select *
  into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false, 'error', 'Payment not found', 'error_code', 'PAYMENT_NOT_FOUND'
    );
  end if;

  -- 4. Validate subscription reference
  if v_payment.purpose = any(v_subscription_required_purposes) then
    if v_payment.subscription_id is null then
      return jsonb_build_object(
        'success', false, 'error', 'Subscription reference required for purpose: ' || v_payment.purpose,
        'error_code', 'MISSING_SUBSCRIPTION'
      );
    end if;
  end if;

  -- 5. Idempotency
  if v_payment.status = 'completed' and p_decision = 'approved' then
    return jsonb_build_object(
      'success', true, 'message', 'Payment already approved', 'idempotent', true,
      'payment_id', p_payment_id, 'status', v_payment.status
    );
  end if;

  if v_payment.status = 'failed' and p_decision = 'rejected' then
    return jsonb_build_object(
      'success', true, 'message', 'Payment already rejected', 'idempotent', true,
      'payment_id', p_payment_id, 'status', v_payment.status
    );
  end if;

  -- 6. Verify payment is in verification_required state
  if v_payment.status <> 'verification_required' then
    return jsonb_build_object(
      'success', false, 'error', 'Payment cannot be ' || p_decision || ' from status: ' || v_payment.status,
      'error_code', 'INVALID_STATUS_TRANSITION', 'current_status', v_payment.status
    );
  end if;

  -- 7. Validate payment purpose
  if v_payment.purpose <> all(v_allowed_purposes) then
    return jsonb_build_object(
      'success', false, 'error', 'Invalid payment purpose: ' || v_payment.purpose,
      'error_code', 'INVALID_PURPOSE'
    );
  end if;

  -- 8. Validate trusted renewal/upgrade references
  if p_decision = 'approved' and v_payment.subscription_id is not null then
    select *
    into v_subscription
    from public.subscriptions
    where id = v_payment.subscription_id
    for update;

    if not found then
      return jsonb_build_object(
        'success', false, 'error', 'Subscription not found for payment',
        'error_code', 'SUBSCRIPTION_NOT_FOUND'
      );
    end if;

    if v_payment.tenant_id <> v_subscription.tenant_id then
      return jsonb_build_object(
        'success', false, 'error', 'Payment tenant does not match subscription tenant',
        'error_code', 'TENANT_MISMATCH'
      );
    end if;

    if v_payment.purpose = 'subscription_renewal' then
      if v_payment.renewal_period_start is null or v_payment.renewal_period_end is null then
        return jsonb_build_object(
          'success', false, 'error', 'Renewal payment requires trusted renewal_period_start and renewal_period_end',
          'error_code', 'MISSING_RENEWAL_PERIOD'
        );
      end if;
      if v_payment.renewal_period_start >= v_payment.renewal_period_end then
        return jsonb_build_object(
          'success', false, 'error', 'Invalid renewal period reference', 'error_code', 'INVALID_RENEWAL_PERIOD'
        );
      end if;
      if v_subscription.status not in ('active', 'trialing', 'past_due', 'canceled', 'expired') then
        return jsonb_build_object(
          'success', false, 'error', 'Subscription cannot be renewed from status: ' || v_subscription.status,
          'error_code', 'INVALID_SUBSCRIPTION_STATE'
        );
      end if;
      if v_payment.renewal_period_start < v_subscription.current_period_end then
        return jsonb_build_object(
          'success', false, 'error', 'Renewal payment period starts before current subscription billing period end',
          'error_code', 'RENEWAL_PERIOD_MISMATCH'
        );
      end if;
    elsif v_payment.purpose = 'subscription_upgrade' then
      if v_subscription.status <> 'active' then
        return jsonb_build_object(
          'success', false, 'error', 'Subscription cannot be upgraded from status: ' || v_subscription.status,
          'error_code', 'INVALID_SUBSCRIPTION_STATE'
        );
      end if;
      if v_payment.target_plan_id is null then
        return jsonb_build_object(
          'success', false, 'error', 'Upgrade payment requires trusted target_plan_id',
          'error_code', 'MISSING_TARGET_PLAN'
        );
      end if;
      if v_payment.expected_amount is null then
        return jsonb_build_object(
          'success', false, 'error', 'Upgrade payment requires trusted expected_amount',
          'error_code', 'MISSING_EXPECTED_AMOUNT'
        );
      end if;
      if v_subscription.scheduled_plan_id is null then
        return jsonb_build_object(
          'success', false, 'error', 'Subscription has no scheduled plan for upgrade',
          'error_code', 'MISSING_SCHEDULED_PLAN'
        );
      end if;
      if v_payment.target_plan_id <> v_subscription.scheduled_plan_id then
        return jsonb_build_object(
          'success', false, 'error', 'Upgrade payment target_plan_id does not match subscription scheduled_plan_id',
          'error_code', 'TARGET_PLAN_MISMATCH'
        );
      end if;
      select *
      into v_target_plan
      from public.plans
      where id = v_payment.target_plan_id;
      if not found then
        return jsonb_build_object(
          'success', false, 'error', 'Target plan not found', 'error_code', 'TARGET_PLAN_NOT_FOUND'
        );
      end if;
      if v_target_plan.is_active is distinct from true then
        return jsonb_build_object(
          'success', false, 'error', 'Target plan is not active', 'error_code', 'TARGET_PLAN_INACTIVE'
        );
      end if;
      if v_payment.currency <> 'BDT' then
        return jsonb_build_object(
          'success', false, 'error', 'Upgrade payment currency must match target plan pricing currency',
          'error_code', 'CURRENCY_MISMATCH'
        );
      end if;
      if v_payment.amount <> v_payment.expected_amount then
        return jsonb_build_object(
          'success', false, 'error', 'Upgrade payment amount must match trusted expected amount',
          'error_code', 'AMOUNT_MISMATCH'
        );
      end if;
    end if;
  end if;

  -- 8b. On rejection of an upgrade or downgrade payment, clear the scheduled
  --     plan change AND downgrade_request_id ONLY if the payment's request ID
  --     matches the subscription's current request ID. Never clear an unrelated
  --     or newer scheduled plan.
  if p_decision = 'rejected' and v_payment.purpose in ('subscription_upgrade', 'subscription_downgrade') and v_payment.subscription_id is not null then
    select *
    into v_subscription
    from public.subscriptions
    where id = v_payment.subscription_id
    for update;

    if not found then
      return jsonb_build_object(
        'success', false, 'error', 'Subscription not found for payment',
        'error_code', 'SUBSCRIPTION_NOT_FOUND'
      );
    end if;

    if v_payment.tenant_id <> v_subscription.tenant_id then
      return jsonb_build_object(
        'success', false, 'error', 'Payment tenant does not match subscription tenant',
        'error_code', 'TENANT_MISMATCH'
      );
    end if;

    -- Match on downgrade_request_id: only clear if this payment's request
    -- matches the subscription's current scheduled request.
    if v_subscription.scheduled_plan_id = v_payment.target_plan_id
       and v_subscription.downgrade_request_id is not null
       and v_payment.metadata->>'downgrade_request_id' = v_subscription.downgrade_request_id::text then
      update public.subscriptions
      set scheduled_plan_id = null,
          scheduled_plan_change_at = null,
          downgrade_request_id = null,
          updated_at = now()
      where id = v_payment.subscription_id;
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
    select status into v_payment.status
    from public.payments where id = p_payment_id;
    return jsonb_build_object(
      'success', true, 'message', 'Payment already processed by concurrent request',
      'idempotent', true, 'payment_id', p_payment_id, 'status', v_payment.status
    );
  end if;

  -- 11. If approved, handle subscription activation/renewal/upgrade/downgrade
  if p_decision = 'approved' and v_payment.subscription_id is not null then
    if v_payment.purpose = 'subscription_initial'
       and v_subscription.status in ('trialing', 'past_due', 'canceled', 'expired') then
      update public.subscriptions
      set status = 'active',
          billing_cycle_anchor = coalesce(v_subscription.billing_cycle_anchor, now()),
          current_period_start = now(),
          current_period_end = now() + interval '1 month',
          trial_start = null, trial_end = null, grace_period_end = null,
          canceled_at = null, cancel_at_period_end = false,
          suspended_at = null, ended_at = null, updated_at = now()
      where id = v_payment.subscription_id;

    elsif v_payment.purpose = 'subscription_renewal'
       and v_subscription.status in ('active', 'trialing', 'past_due', 'canceled', 'expired') then
      update public.subscriptions
      set status = 'active',
          billing_cycle_anchor = coalesce(v_subscription.billing_cycle_anchor, v_payment.renewal_period_start),
          current_period_start = v_payment.renewal_period_start,
          current_period_end = v_payment.renewal_period_end,
          trial_start = null, trial_end = null, grace_period_end = null,
          canceled_at = null, cancel_at_period_end = false,
          suspended_at = null, ended_at = null, updated_at = now()
      where id = v_payment.subscription_id;

    elsif v_payment.purpose = 'subscription_upgrade' and v_subscription.status = 'active' then
      update public.subscriptions
      set plan_id = v_payment.target_plan_id,
          scheduled_plan_id = null, scheduled_plan_change_at = null,
          updated_at = now()
      where id = v_payment.subscription_id;

    elsif v_payment.purpose = 'subscription_downgrade' and v_subscription.status = 'active' then
      -- Downgrade: scheduled for next billing date - payment confirms intent
      -- The downgrade will be applied at scheduled_plan_change_at via cron
      -- Here we just confirm the payment succeeded
      update public.subscriptions
      set updated_at = now()
      where id = v_payment.subscription_id;
    end if;
  end if;

  -- 12. Create immutable audit record
  insert into public.payment_verification_audit (
    payment_id, admin_user_id, decision, previous_status, new_status, reason
  ) values (
    p_payment_id, auth.uid(), p_decision, 'verification_required',
    v_new_status, p_reason
  )
  returning id into v_audit_id;

  -- 13. Return success
  v_result := jsonb_build_object(
    'success', true, 'message', 'Payment ' || p_decision, 'idempotent', false,
    'payment_id', p_payment_id, 'audit_id', v_audit_id,
    'previous_status', 'verification_required', 'new_status', v_new_status,
    'subscription_id', v_payment.subscription_id
  );

  return v_result;

exception
  when others then
    return jsonb_build_object(
      'success', false, 'error', 'Payment approval failed',
      'error_code', 'APPROVAL_ERROR'
    );
end;
$$;

-- Revoke from PUBLIC, anon, and authenticated; grant to authenticated and service_role
revoke execute on function public.approve_or_reject_payment(uuid, text, text) from public;
grant execute on function public.approve_or_reject_payment(uuid, text, text) to authenticated, service_role;