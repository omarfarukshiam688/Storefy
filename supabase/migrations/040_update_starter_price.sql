-- Update STARTER plan price from 300 to 299 BDT
-- Forward-only migration: updates the existing active STARTER plan price
-- Preserves plan ID and all tenant foreign-key relationships

update public.plans
set price_monthly = 299,
    updated_at = now()
where lower(name) = 'starter'
  and is_active = true
  and price_monthly = 300;