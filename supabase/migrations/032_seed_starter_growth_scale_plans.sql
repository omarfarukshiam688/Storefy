-- Seed Starter, Growth, and Scale plans for the tenant upgrade experience.
-- Retire the legacy Pro plan so the pricing UI shows exactly three paid tiers.

update public.plans
set is_active = false
where lower(name) = 'pro';

insert into public.plans (name, description, price_monthly, product_limit, order_limit, storage_limit_bytes, features)
values
  ('Starter', 'For new businesses getting started.', 699, 100, 1000, 2147483648, '{"analytics":true,"custom_domain":false,"team_members":5}'::jsonb),
  ('Growth', 'For growing businesses scaling up.', 1499, 500, 5000, 5368709120, '{"analytics":true,"custom_domain":true,"team_members":10}'::jsonb),
  ('Scale', 'For established businesses at scale.', 2999, 2000, 20000, 21474836480, '{"analytics":true,"custom_domain":true,"team_members":25}'::jsonb)
on conflict (lower(name)) do nothing;
