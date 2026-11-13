-- Atomic scheduled downgrade execution + subscription change audit
-- Migration 051 (next after 050)
-- Dependencies: 037-050 already applied
--
-- Purpose:
--   1. Create public.subscription_change_audit table to record subscription
--      lifecycle changes (downgrade/upgrade application, failures) durably.
--      This is separate from public.payment_verification_audit, which records
--      only Super Admin approve/reject decisions on payments.
--   2. Create public.apply_subscription_downgrades() RPC that applies all due
--      scheduled downgrades inside a single database transaction with row
--      locking (FOR UPDATE SKIP LOCKED) for concurrent-worker safety.
--      Restricted to service_role only.
--      Critically: applies a scheduled downgrade ONLY when a corresponding
--      subscription_downgrade payment exists with status = 'completed'
--      (Super Admin approval). Pending, rejected, or missing payments cause
--      the downgrade to be skipped with a durable audit record.
--
-- Security:
--   subscription_change_audit: RLS enabled, SELECT for authenticated (Super
--     Admin read via RLS), ALL for service_role, no access for tenant users.
--   apply_subscription_downgrades(): SECURITY DEFINER, explicit search_path,
--     revoked from PUBLIC/anon/authenticated, granted to service_role only.
--     The RPC performs no auth.uid() or tenant-membership check; it is
--     intended to be called only by a trusted scheduled worker.
--
-- Idempotency:
--   A unique constraint on (subscription_id, target_plan_id,
--   scheduled_change_at, event_type) prevents duplicate audit records for
--   the same scheduled change. The RPC's UPDATE ... WHERE scheduled_plan_id
--   IS NOT NULL clears the scheduled fields, so a re-run cannot re-apply
--   the same change.
--
-- Deployment: Apply manually via Supabase Dashboard SQL Editor.
-- Rollback: Drop the RPC and the audit table (subscription data is unaffected).

-- 1. Subscription change audit table
create table public.subscription_change_audit (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete restrict,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  previous_plan_id uuid not null references public.plans (id) on delete restrict,
  target_plan_id uuid not null references public.plans (id) on delete restrict,
  scheduled_change_at timestamptz not null,
  applied_at timestamptz not null default now(),
  event_type text not null check (event_type in (
    'downgrade_applied',
    'downgrade_failed_inactive_target',
    'downgrade_failed_target_deleted',
    'downgrade_failed_subscription_ineligible',
    'downgrade_failed_concurrent_change',
    'downgrade_failed_payment_not_approved',
    'downgrade_failed_payment_pending',
    'downgrade_failed_payment_rejected',
    'downgrade_failed_payment_missing',
    'downgrade_failed_payment_multiple',
    'downgrade_failed_unknown'
  )),
  error_code text,
  error_message text,
  metadata jsonb
);

create unique index idx_subscription_change_audit_idempotent
  on public.subscription_change_audit (
    subscription_id,
    target_plan_id,
    scheduled_change_at,
    event_type
  );

create index idx_subscription_change_audit_subscription_id
  on public.subscription_change_audit (subscription_id);
create index idx_subscription_change_audit_tenant_id
  on public.subscription_change_audit (tenant_id);
create index idx_subscription_change_audit_applied_at
  on public.subscription_change_audit (applied_at);

-- RLS
alter table public.subscription_change_audit enable row level security;

-- Super admins can read all audit records
create policy "Super admins can read subscription change audit"
  on public.subscription_change_audit for select to authenticated
  using (public.is_super_admin());

-- No INSERT/UPDATE/DELETE for authenticated users - only trusted RPC can create
-- Tenant users have no access

-- Grants
grant select on public.subscription_change_audit to authenticated;
grant all on public.subscription_change_audit to service_role;

-- 2. Atomic scheduled downgrade executor RPC
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
  v_payment_count integer;
  v_error_code text;
  v_error_message text;
  v_audit_id uuid;
begin
  -- Process each due subscription with row locking to prevent concurrent
  -- workers from handling the same subscription. SKIP LOCKED means a worker
  -- never blocks on a row another worker is already processing.
  for v_sub in
    select s.id, s.tenant_id, s.plan_id as previous_plan_id,
           s.scheduled_plan_id as target_plan_id,
           s.scheduled_change_at as scheduled_change_at
    from public.subscriptions s
    where s.scheduled_plan_id is not null
      and s.scheduled_change_at <= now()
      and s.status = 'active'
    for update skip locked
  loop
    -- Reset per-iteration error state
    v_error_code := null;
    v_error_message := null;

    -- Validate target plan still exists and is active
    select *
    into v_target_plan
    from public.plans
    where id = v_sub.target_plan_id;

    if not found then
      insert into public.subscription_change_audit (
        subscription_id,
        tenant_id,
        previous_plan_id,
        target_plan_id,
        scheduled_change_at,
        applied_at,
        event_type,
        error_code,
        error_message,
        metadata
      ) values (
        v_sub.subscription_id,
        v_sub.tenant_id,
        v_sub.previous_plan_id,
        v_sub.target_plan_id,
        v_sub.scheduled_change_at,
        now(),
        'downgrade_failed_target_deleted',
        'TARGET_PLAN_DELETED',
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
        subscription_id,
        tenant_id,
        previous_plan_id,
        target_plan_id,
        scheduled_change_at,
        applied_at,
        event_type,
        error_code,
        error_message,
        metadata
      ) values (
        v_sub.subscription_id,
        v_sub.tenant_id,
        v_sub.previous_plan_id,
        v_sub.target_plan_id,
        v_sub.scheduled_change_at,
        now(),
        'downgrade_failed_inactive_target',
        'TARGET_PLAN_INACTIVE',
        'Target plan is no longer active',
        jsonb_build_object(
          'previous_plan_id', v_sub.previous_plan_id,
          'target_plan_id', v_sub.target_plan_id,
          'scheduled_change_at', v_sub.scheduled_change_at
        )
      );
      continue;
    end if;

    -- Re-verify the subscription still has this scheduled change (another
    -- worker or the Super Admin approval may have cleared it already).
    -- The FOR UPDATE SKIP LOCKED already gave us the row, but we re-check
    -- the critical fields to be safe against concurrent modification.
    if v_sub.scheduled_plan_id is null then
      insert into public.subscription_change_audit (
        subscription_id,
        tenant_id,
        previous_plan_id,
        target_plan_id,
        scheduled_change_at,
        applied_at,
        event_type,
        error_code,
        error_message,
        metadata
      ) values (
        v_sub.subscription_id,
        v_sub.tenant_id,
        v_sub.previous_plan_id,
        v_sub.target_plan_id,
        v_sub.scheduled_change_at,
        now(),
        'downgrade_failed_concurrent_change',
        'SCHEDULE_CLEARED',
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
    -- The downgrade may only be applied after a Super Admin approves the
    -- payment (status = 'completed'). Pending, rejected, or missing
    -- payments must not trigger a plan change.
    --
    -- The payment is correlated to this specific scheduling event via
    -- metadata.effective_at, which stores the scheduled_change_at value
    -- set at payment creation time. Comparison uses timestamptz casting
    -- (not text) to avoid timezone/formatting mismatches. This prevents
    -- an older completed payment for the same subscription and target plan
    -- from authorizing a newer downgrade request whose payment is still pending.
    select count(*)
    into v_payment_count
    from public.payments p
    where p.subscription_id = v_sub.subscription_id
      and p.purpose = 'subscription_downgrade'
      and p.target_plan_id = v_sub.target_plan_id
      and p.status = 'completed'
      and (p.metadata->>'effective_at')::timestamptz = v_sub.scheduled_change_at;

    if v_payment_count = 0 then
      -- Determine the specific reason for the missing approval
      select p.status
      into v_payment
      from public.payments p
      where p.subscription_id = v_sub.subscription_id
        and p.purpose = 'subscription_downgrade'
        and p.target_plan_id = v_sub.target_plan_id
        and (p.metadata->>'effective_at')::timestamptz = v_sub.scheduled_change_at
        limit 1;

      if not found then
        insert into public.subscription_change_audit (
          subscription_id,
          tenant_id,
          previous_plan_id,
          target_plan_id,
          scheduled_change_at,
          applied_at,
          event_type,
          error_code,
          error_message,
          metadata
        ) values (
          v_sub.subscription_id,
          v_sub.tenant_id,
          v_sub.previous_plan_id,
          v_sub.target_plan_id,
          v_sub.scheduled_change_at,
          now(),
          'downgrade_failed_payment_missing',
          'PAYMENT_MISSING',
          'No downgrade payment found for this subscription and target plan',
          jsonb_build_object(
            'previous_plan_id', v_sub.previous_plan_id,
            'target_plan_id', v_sub.target_plan_id,
            'scheduled_change_at', v_sub.scheduled_change_at
          )
        );
      else
        if v_payment.status = 'verification_required' then
          insert into public.subscription_change_audit (
            subscription_id,
            tenant_id,
            previous_plan_id,
            target_plan_id,
            scheduled_change_at,
            applied_at,
            event_type,
            error_code,
            error_message,
            metadata
          ) values (
            v_sub.subscription_id,
            v_sub.tenant_id,
            v_sub.previous_plan_id,
            v_sub.target_plan_id,
            v_sub.scheduled_change_at,
            now(),
            'downgrade_failed_payment_pending',
            'PAYMENT_NOT_APPROVED',
            'Downgrade payment is pending Super Admin verification',
            jsonb_build_object(
              'previous_plan_id', v_sub.previous_plan_id,
              'target_plan_id', v_sub.target_plan_id,
              'scheduled_change_at', v_sub.scheduled_change_at,
              'payment_status', v_payment.status
            )
          );
        else
          insert into public.subscription_change_audit (
            subscription_id,
            tenant_id,
            previous_plan_id,
            target_plan_id,
            scheduled_change_at,
            applied_at,
            event_type,
            error_code,
            error_message,
            metadata
          ) values (
            v_sub.subscription_id,
            v_sub.tenant_id,
            v_sub.previous_plan_id,
            v_sub.target_plan_id,
            v_sub.scheduled_change_at,
            now(),
            'downgrade_failed_payment_rejected',
            'PAYMENT_NOT_APPROVED',
            'Downgrade payment has not been approved (status: ' || v_payment.status || ')',
            jsonb_build_object(
              'previous_plan_id', v_sub.previous_plan_id,
              'target_plan_id', v_sub.target_plan_id,
              'scheduled_change_at', v_sub.scheduled_change_at,
              'payment_status', v_payment.status
            )
          );
        end if;
      end if;
      continue;
    end if;

    if v_payment_count > 1 then
      insert into public.subscription_change_audit (
        subscription_id,
        tenant_id,
        previous_plan_id,
        target_plan_id,
        scheduled_change_at,
        applied_at,
        event_type,
        error_code,
        error_message,
        metadata
      ) values (
        v_sub.subscription_id,
        v_sub.tenant_id,
        v_sub.previous_plan_id,
        v_sub.target_plan_id,
        v_sub.scheduled_change_at,
        now(),
        'downgrade_failed_payment_multiple',
        'PAYMENT_MULTIPLE',
        'Multiple approved downgrade payments found for this subscription and target plan',
        jsonb_build_object(
          'previous_plan_id', v_sub.previous_plan_id,
          'target_plan_id', v_sub.target_plan_id,
          'scheduled_change_at', v_sub.scheduled_change_at,
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
        updated_at = now()
    where id = v_sub.subscription_id
      and scheduled_plan_id = v_sub.target_plan_id;

    if not found then
      -- Another transaction cleared the schedule between our SELECT and UPDATE
      insert into public.subscription_change_audit (
        subscription_id,
        tenant_id,
        previous_plan_id,
        target_plan_id,
        scheduled_change_at,
        applied_at,
        event_type,
        error_code,
        error_message,
        metadata
      ) values (
        v_sub.subscription_id,
        v_sub.tenant_id,
        v_sub.previous_plan_id,
        v_sub.target_plan_id,
        v_sub.scheduled_change_at,
        now(),
        'downgrade_failed_concurrent_change',
        'SCHEDULE_CLEARED_CONCURRENT',
        'Scheduled plan change was cleared by another transaction',
        jsonb_build_object(
          'previous_plan_id', v_sub.previous_plan_id,
          'target_plan_id', v_sub.target_plan_id,
          'scheduled_change_at', v_sub.scheduled_change_at
        )
      );
      continue;
    end if;

    -- Record successful application
    insert into public.subscription_change_audit (
      subscription_id,
      tenant_id,
      previous_plan_id,
      target_plan_id,
      scheduled_change_at,
      applied_at,
      event_type,
      metadata
    ) values (
      v_sub.subscription_id,
      v_sub.tenant_id,
      v_sub.previous_plan_id,
      v_sub.target_plan_id,
      v_sub.scheduled_change_at,
      now(),
      'downgrade_applied',
      jsonb_build_object(
        'previous_plan_id', v_sub.previous_plan_id,
        'target_plan_id', v_sub.target_plan_id,
        'scheduled_change_at', v_sub.scheduled_change_at
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
-- This RPC performs no auth.uid() or tenant-membership check; it is intended
-- to be called only by a trusted scheduled worker with service_role credentials.
revoke execute on function public.apply_subscription_downgrades() from public, anon, authenticated;
grant execute on function public.apply_subscription_downgrades() to service_role;
