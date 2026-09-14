-- Fix plans RLS to allow new users to read active plans during onboarding
-- and seed initial Free/Pro plans idempotently.

-- 1. Drop the existing circular policy
drop policy if exists "Tenant members can read their plan" on public.plans;

-- 2. Create a new policy that allows any authenticated user to read active plans
create policy "Authenticated users can read active plans"
  on public.plans for select to authenticated
  using (is_active = true);

-- 3. Seed initial plans (idempotent)
insert into public.plans (name, description, price_monthly, product_limit, order_limit, storage_limit_bytes, features)
values
  ('Free', 'Free tier for small businesses getting started.', 0, 50, 100, 1073741824, '{"analytics": true, "custom_domain": false, "team_members": 2}'::jsonb),
  ('Pro', 'Pro tier for growing businesses.', 2900, 500, 5000, 5368709120, '{"analytics": true, "custom_domain": true, "team_members": 10}'::jsonb)
on conflict (lower(name)) do nothing;
