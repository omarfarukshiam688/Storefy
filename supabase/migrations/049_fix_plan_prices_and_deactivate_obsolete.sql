-- Fix subscription plan data to match approved Storefy business model.
--
-- Approved paid plans (monthly, BDT):
--   Starter  -- ৳299/month
--   Growth   -- ৳699/month
--   Business -- ৳1,299/month
--
-- Issues corrected by this migration:
-- 1. Starter price was seeded at 699 (migration 032); corrected to 299.
-- 2. Growth price was seeded at 1499 (migration 032); corrected to 699.
-- 3. Scale plan seeded at 2999 (migration 032) is not an approved plan;
--    deactivated (is_active = false) but preserved for historical reference.
-- 4. Business plan at 1299 added as a new active plan; if it already exists
--    with an incorrect price, it is corrected.
-- 5. Free plan (price 0, from migrations 009/010) is not an approved
--    purchasable plan; deactivated but preserved for historical reference.
-- 6. Pro plan was already deactivated by migration 032; preserved.
--
-- Historical plan records are NOT deleted. The `is_active` flag controls
-- whether a plan can be selected for new subscriptions, upgrades, or
-- renewals. Completed payment records and existing subscriptions continue
-- to reference their original plan IDs.
--
-- No schema changes (no new columns, tables, or constraints). The `plans`
-- table already supports `is_active` (migration 001) and `price_monthly`
-- (migration 001).
--
-- Deployment: This SQL must be applied manually via Supabase Dashboard
-- SQL Editor. It is idempotent-safe — repeated execution produces the same
-- intended state. All statements run inside a single transaction for
-- atomicity.
--
-- Rollback: Revert price changes and re-activate Scale/Free manually;
-- delete the Business plan only if no subscriptions reference it.

begin;

-- 1. Correct Starter price: 699 -> 299
update public.plans
set price_monthly = 299,
    updated_at = now()
where lower(name) = 'starter';

-- 2. Correct Growth price: 1499 -> 699
update public.plans
set price_monthly = 699,
    updated_at = now()
where lower(name) = 'growth';

-- 3. Deactivate Scale (not an approved plan; preserve for history)
update public.plans
set is_active = false,
    updated_at = now()
where lower(name) = 'scale';

-- 4. Deactivate Free (not an approved purchasable plan; preserve for history)
update public.plans
set is_active = false,
    updated_at = now()
where lower(name) = 'free';

-- 5. Add or correct Business plan at 1299 (idempotent upsert)
-- If a Business plan already exists with a wrong price, it is corrected.
-- If it does not exist, it is inserted. No duplicates are created.
insert into public.plans (
  name,
  description,
  price_monthly,
  product_limit,
  order_limit,
  storage_limit_bytes,
  features,
  is_active
) values
  (
    'Business',
    'For established businesses needing full capability.',
    1299,
    1000,
    10000,
    10737418240,
    '{"analytics":true,"custom_domain":true,"team_members":25}'::jsonb,
    true
  )
on conflict (lower(name)) do update set
  price_monthly = excluded.price_monthly,
  description = excluded.description,
  product_limit = excluded.product_limit,
  order_limit = excluded.order_limit,
  storage_limit_bytes = excluded.storage_limit_bytes,
  features = excluded.features,
  is_active = excluded.is_active,
  updated_at = now();

commit;
