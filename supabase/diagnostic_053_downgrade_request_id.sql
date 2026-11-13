-- Diagnostic 1: Scheduled downgrades with NULL request IDs
-- These subscriptions have a scheduled downgrade but no downgrade_request_id,
-- meaning they were scheduled before migration 052 was applied.
-- They cannot be matched to any payment and will remain stuck until
-- a new downgrade request is created with a fresh request ID.
select
  s.id as subscription_id,
  s.tenant_id,
  s.plan_id as current_plan_id,
  s.scheduled_plan_id as target_plan_id,
  s.scheduled_plan_change_at,
  s.status as subscription_status,
  s.downgrade_request_id
from public.subscriptions s
where s.scheduled_plan_id is not null
  and s.status = 'active'
  and s.downgrade_request_id is null
order by s.scheduled_plan_change_at;

-- Diagnostic 2: Scheduled downgrades with NO downgrade payment at all for the subscription
-- These subscriptions have a downgrade_request_id, but no payment of purpose
-- 'subscription_downgrade' exists for this subscription (any target plan, any request ID).
-- They cannot be applied until a payment is created and approved.
select
  s.id as subscription_id,
  s.tenant_id,
  s.plan_id as current_plan_id,
  s.scheduled_plan_id as target_plan_id,
  s.scheduled_plan_change_at,
  s.downgrade_request_id
from public.subscriptions s
left join public.payments p
  on p.subscription_id = s.id
  and p.purpose = 'subscription_downgrade'
where s.scheduled_plan_id is not null
  and s.status = 'active'
  and s.downgrade_request_id is not null
  and p.id is null
order by s.scheduled_plan_change_at;

-- Diagnostic 2b: Scheduled downgrades with an exact payment for the CURRENT request that is NOT completed
-- These have a payment with the correct subscription_id, target_plan_id, and request ID,
-- but its status is not completed (e.g., verification_required, failed, rejected).
-- They cannot be applied until the payment is approved.
select
  s.id as subscription_id,
  s.tenant_id,
  s.plan_id as current_plan_id,
  s.scheduled_plan_id as target_plan_id,
  s.scheduled_plan_change_at,
  s.downgrade_request_id,
  p.id as payment_id,
  p.status as payment_status,
  p.metadata->>'downgrade_request_id' as payment_request_id
from public.subscriptions s
inner join public.payments p
  on p.subscription_id = s.id
  and p.purpose = 'subscription_downgrade'
  and p.target_plan_id = s.scheduled_plan_id
  and p.metadata->>'downgrade_request_id' IS NOT DISTINCT FROM s.downgrade_request_id::text
  and p.status <> 'completed'
where s.scheduled_plan_id is not null
  and s.status = 'active'
  and s.downgrade_request_id is not null
order by s.scheduled_plan_change_at;

-- Diagnostic 3: Scheduled downgrades with downgrade payments, but NONE match the CURRENT request
-- These subscriptions have at least one downgrade payment, but all of them have
-- incorrect target plan or request ID compared to the current scheduled downgrade.
-- These are typically stale payments from previous downgrade attempts.
select
  s.id as subscription_id,
  s.tenant_id,
  s.plan_id as current_plan_id,
  s.scheduled_plan_id as scheduled_target_plan_id,
  s.scheduled_plan_change_at,
  s.downgrade_request_id,
  p.id as payment_id,
  p.purpose as payment_purpose,
  p.status as payment_status,
  p.target_plan_id as payment_target_plan_id,
  p.metadata->>'downgrade_request_id' as payment_request_id,
  case
    when p.target_plan_id IS DISTINCT FROM s.scheduled_plan_id then 'target plan mismatch'
    when p.metadata->>'downgrade_request_id' IS DISTINCT FROM s.downgrade_request_id::text then 'request ID mismatch'
    else 'unknown mismatch'
  end as mismatch_reason
from public.subscriptions s
inner join public.payments p
  on p.subscription_id = s.id
  and p.purpose = 'subscription_downgrade'
  and (
    p.target_plan_id IS DISTINCT FROM s.scheduled_plan_id
    or p.metadata->>'downgrade_request_id' IS DISTINCT FROM s.downgrade_request_id::text
  )
where s.scheduled_plan_id is not null
  and s.status = 'active'
  and s.downgrade_request_id is not null
  -- Exclude subscriptions that have a matching payment for the current request (any status)
  and not exists (
    select 1 from public.payments p2
    where p2.subscription_id = s.id
      and p2.purpose = 'subscription_downgrade'
      and p2.target_plan_id IS NOT DISTINCT FROM s.scheduled_plan_id
      and p2.metadata->>'downgrade_request_id' IS NOT DISTINCT FROM s.downgrade_request_id::text
  )
order by s.scheduled_plan_change_at;

-- Diagnostic 4: Verify the downgrade_request_id column and its schema definition
select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length,
  numeric_precision,
  numeric_scale
from information_schema.columns
where table_schema = 'public'
  and table_name = 'subscriptions'
  and column_name = 'downgrade_request_id'
order by table_name, ordinal_position;
