-- Add archived_product_limit to plans table and seed finalized plan configuration
-- This migration safely transitions from old demo plans to finalized STARTER/GROWTH/BUSINESS plans
-- while preserving existing tenant plan references.
-- NO Free plan - trials use selected paid plan limits.

-- 1. Add archived_product_limit column with default 0
alter table public.plans
add column if not exists archived_product_limit integer not null default 0 check (archived_product_limit >= 0);

-- 2. Deactivate old demo plans that are no longer used
-- Keep them in the table for FK integrity but mark inactive
update public.plans
set is_active = false,
    updated_at = now()
where lower(name) in ('pro', 'scale', 'starter', 'growth', 'free');

-- 3. Insert or update finalized plans
-- STARTER: BDT 299, 20 active, 5 archived, 100 orders, 2 team, 1GB
insert into public.plans (name, description, price_monthly, product_limit, archived_product_limit, order_limit, storage_limit_bytes, features, is_active)
values (
  'STARTER',
  'For new businesses getting started.',
  299,
  20,
  5,
  100,
  1073741824,  -- 1 GB
  '{"analytics": true, "custom_domain": false, "team_members": 2}'::jsonb,
  true
)
on conflict (lower(name)) do update set
  name = excluded.name,
  description = excluded.description,
  price_monthly = excluded.price_monthly,
  product_limit = excluded.product_limit,
  archived_product_limit = excluded.archived_product_limit,
  order_limit = excluded.order_limit,
  storage_limit_bytes = excluded.storage_limit_bytes,
  features = excluded.features,
  is_active = excluded.is_active,
  updated_at = now();

-- GROWTH: BDT 699, 150 active, 30 archived, 500 orders, 5 team, 6GB
insert into public.plans (name, description, price_monthly, product_limit, archived_product_limit, order_limit, storage_limit_bytes, features, is_active)
values (
  'GROWTH',
  'For growing businesses scaling up.',
  699,
  150,
  30,
  500,
  6442450944,  -- 6 GB
  '{"analytics": true, "custom_domain": true, "team_members": 5}'::jsonb,
  true
)
on conflict (lower(name)) do update set
  name = excluded.name,
  description = excluded.description,
  price_monthly = excluded.price_monthly,
  product_limit = excluded.product_limit,
  archived_product_limit = excluded.archived_product_limit,
  order_limit = excluded.order_limit,
  storage_limit_bytes = excluded.storage_limit_bytes,
  features = excluded.features,
  is_active = excluded.is_active,
  updated_at = now();

-- BUSINESS: BDT 1299, 500 active, 100 archived, 2000 orders, 10 team, 12GB
insert into public.plans (name, description, price_monthly, product_limit, archived_product_limit, order_limit, storage_limit_bytes, features, is_active)
values (
  'BUSINESS',
  'For established businesses at scale.',
  1299,
  500,
  100,
  2000,
  12884901888,  -- 12 GB
  '{"analytics": true, "custom_domain": true, "team_members": 10}'::jsonb,
  true
)
on conflict (lower(name)) do update set
  name = excluded.name,
  description = excluded.description,
  price_monthly = excluded.price_monthly,
  product_limit = excluded.product_limit,
  archived_product_limit = excluded.archived_product_limit,
  order_limit = excluded.order_limit,
  storage_limit_bytes = excluded.storage_limit_bytes,
  features = excluded.features,
  is_active = excluded.is_active,
  updated_at = now();

-- 4. Migrate existing tenants on old plans to closest new plan
-- Tenants on 'pro' (old BDT 2900) -> BUSINESS (BDT 1299)
-- Tenants on 'scale' (old BDT 2999) -> BUSINESS (BDT 1299)
-- Tenants on old 'starter' (BDT 699) -> STARTER (BDT 299)
-- Tenants on 'free' -> STARTER (BDT 299) as default fallback
-- This ensures no tenant is left without a valid active plan

update public.tenants t
set plan_id = p_new.id,
    updated_at = now()
from public.plans p_old
join public.plans p_new on lower(p_new.name) = case
  when lower(p_old.name) = 'pro' then 'business'
  when lower(p_old.name) = 'scale' then 'business'
  when lower(p_old.name) = 'starter' then 'starter'
  when lower(p_old.name) = 'growth' then 'growth'
  when lower(p_old.name) = 'free' then 'starter'
  else lower(p_old.name)
end
where t.plan_id = p_old.id
  and p_old.is_active = false
  and p_new.is_active = true
  and lower(p_old.name) in ('pro', 'scale', 'starter', 'growth', 'free');

-- 5. Verify no tenants reference inactive plans
-- This will raise an exception if any tenant still references an inactive plan
do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.tenants t
  join public.plans p on p.id = t.plan_id
  where p.is_active = false;
  
  if v_count > 0 then
    raise exception 'Found % tenants still referencing inactive plans', v_count;
  end if;
end $$;

-- 6. Safety: Ensure finalized plans have correct canonical name casing
-- (Fixes case where migration was applied before ON CONFLICT included name update)
update public.plans
set name = 'STARTER',
    updated_at = now()
where lower(name) = 'starter' and name <> 'STARTER';

update public.plans
set name = 'GROWTH',
    updated_at = now()
where lower(name) = 'growth' and name <> 'GROWTH';

update public.plans
set name = 'BUSINESS',
    updated_at = now()
where lower(name) = 'business' and name <> 'BUSINESS';