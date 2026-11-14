-- Super Admin classification of historically inactive tenant as subscription_expiry
-- Migration 056: Depends on 055 (tenant_classification_audit table) and 053 (suspendTenantForSubscriptionExpiry logic)
-- This RPC provides a secure, atomic, auditable Super Admin classification operation.
-- Callable by authenticated Super Admins via createClient().

create or replace function public.classify_tenant_suspension_expiry(
  p_tenant_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_tenant public.tenants%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_admin_user_id uuid;
  v_is_super_admin boolean;
  v_subscription_count integer;
  v_now timestamptz := now();
  v_result jsonb;
  v_audit_id uuid;
begin
  -- 1. Verify Super Admin authorization
  select public.is_super_admin() into v_is_super_admin;
  if not coalesce(v_is_super_admin, false) then
    return jsonb_build_object(
      'success', false,
      'error', 'Super admin authorization required',
      'error_code', 'UNAUTHORIZED'
    );
  end if;

  -- Get current admin user ID for audit
  select auth.uid() into v_admin_user_id;
  if v_admin_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Unable to determine admin user identity',
      'error_code', 'ADMIN_IDENTITY_MISSING'
    );
  end if;

  -- 2. Lock tenant row and validate state
  select *
  into v_tenant
  from public.tenants
  where id = p_tenant_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Tenant not found',
      'error_code', 'TENANT_NOT_FOUND'
    );
  end if;

  -- 3. Validate eligibility conditions (ALL must pass)

  -- 3a. Tenant must be inactive
  if v_tenant.is_active then
    return jsonb_build_object(
      'success', false,
      'error', 'Tenant is active; cannot classify suspension reason',
      'error_code', 'TENANT_ACTIVE'
    );
  end if;

  -- 3b. suspension_reason must be NULL (historical unknown)
  if v_tenant.suspension_reason is not null then
    return jsonb_build_object(
      'success', false,
      'error', 'Tenant already has suspension_reason: ' || v_tenant.suspension_reason,
      'error_code', 'SUSPENSION_REASON_ALREADY_SET',
      'current_reason', v_tenant.suspension_reason
    );
  end if;

  -- 3c. No administrative suspension override (should be impossible with NULL check, but defense in depth)

  -- 3d. Lock all existing subscriptions for this tenant to prevent concurrent changes
  -- during eligibility validation. Deterministic ordering reduces deadlock risk.
  -- The tenant row lock (above) serializes against new subscription inserts via FK KEY SHARE lock.
  -- Explicit subscription row locks serialize against concurrent subscription mutations.
  perform s.id
  from public.subscriptions s
  where s.tenant_id = p_tenant_id
  order by s.id
  for update;

  -- 3d. No current active subscription (trialing, active, past_due, suspended)
  select count(*)
  into v_subscription_count
  from public.subscriptions
  where tenant_id = p_tenant_id
    and status in ('trialing', 'active', 'past_due', 'suspended');

  if v_subscription_count > 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'Tenant has a current active subscription',
      'error_code', 'CURRENT_SUBSCRIPTION_EXISTS'
    );
  end if;

  -- 3e. Exactly one expired subscription with elapsed grace period (using transaction timestamp v_now)
  select count(*)
  into v_subscription_count
  from public.subscriptions
  where tenant_id = p_tenant_id
    and status = 'expired'
    and grace_period_end is not null
    and grace_period_end <= v_now;

  if v_subscription_count = 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'No expired subscription with elapsed grace period found',
      'error_code', 'NO_ELAPSED_EXPIRED_SUBSCRIPTION'
    );
  end if;

  if v_subscription_count > 1 then
    return jsonb_build_object(
      'success', false,
      'error', 'Multiple expired subscriptions with elapsed grace period found',
      'error_code', 'MULTIPLE_ELAPSED_EXPIRED_SUBSCRIPTIONS'
    );
  end if;

  -- Retrieve the single qualifying subscription (already locked by perform ... for update above)
  select *
  into v_subscription
  from public.subscriptions
  where tenant_id = p_tenant_id
    and status = 'expired'
    and grace_period_end is not null
    and grace_period_end <= v_now
  order by id
  limit 1;

  -- 3f. Verify subscription belongs to tenant (already checked by tenant_id, but defense in depth)
  if v_subscription.tenant_id <> p_tenant_id then
    return jsonb_build_object(
      'success', false,
      'error', 'Subscription tenant mismatch',
      'error_code', 'SUBSCRIPTION_TENANT_MISMATCH'
    );
  end if;

  -- 3g. No conflicting scheduled subscription state
  select count(*)
  into v_subscription_count
  from public.subscriptions
  where tenant_id = p_tenant_id
    and scheduled_plan_id is not null;

  if v_subscription_count > 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'Tenant has a scheduled plan change; cannot classify',
      'error_code', 'SCHEDULED_PLAN_EXISTS'
    );
  end if;

  -- 4. All validations passed - perform classification atomically
  update public.tenants
  set suspension_reason = 'subscription_expiry',
      updated_at = v_now
  where id = p_tenant_id
    and suspension_reason is null
    and is_active = false;

  if not found then
    -- Concurrent modification - state changed
    return jsonb_build_object(
      'success', false,
      'error', 'Tenant state changed during classification; retry if needed',
      'error_code', 'CONCURRENT_MODIFICATION'
    );
  end if;

  -- 5. Create audit record
  insert into public.tenant_classification_audit (
    tenant_id,
    admin_user_id,
    previous_suspension_reason,
    new_suspension_reason,
    classification_reason,
    subscription_evidence
  ) values (
    p_tenant_id,
    v_admin_user_id,
    null,
    'subscription_expiry',
    'Super Admin classification of historical inactive tenant with expired subscription evidence',
    jsonb_build_object(
      'subscription_id', v_subscription.id,
      'subscription_status', v_subscription.status,
      'grace_period_end', v_subscription.grace_period_end,
      'current_period_end', v_subscription.current_period_end
    )
  )
  returning id into v_audit_id;

  -- 6. Return success
  return jsonb_build_object(
    'success', true,
    'message', 'Tenant classified as subscription_expiry',
    'tenant_id', p_tenant_id,
    'audit_id', v_audit_id,
    'previous_suspension_reason', null,
    'new_suspension_reason', 'subscription_expiry'
  );

exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', 'Classification failed',
      'error_code', 'CLASSIFICATION_ERROR'
    );
end;
$$;

-- Revoke from PUBLIC and anon; grant to authenticated and service_role
-- The authenticated grant is required because the application calls this RPC
-- via the normal SSR createClient() (authenticated user role).
-- Security is enforced inside the SECURITY DEFINER function through:
--   - public.is_super_admin() check
--   - auth.uid() IS NOT NULL check
revoke execute on function public.classify_tenant_suspension_expiry(uuid) from public, anon;
grant execute on function public.classify_tenant_suspension_expiry(uuid) to authenticated, service_role;