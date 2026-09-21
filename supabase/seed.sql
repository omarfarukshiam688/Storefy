-- Development seed data
-- Do NOT run in production.
-- Run with: supabase db reset --seed ./supabase/seed.sql

insert into public.plans (name, description, price_monthly, product_limit, order_limit, storage_limit_bytes, features)
values
  ('Free', 'Free tier for small businesses getting started.', 0, 20, 100, 209715200, '{"analytics": true, "custom_domain": false, "team_members": 2}'::jsonb),
  ('Pro', 'Pro tier for growing businesses.', 2900, 500, 5000, 5368709120, '{"analytics": true, "custom_domain": true, "team_members": 10}'::jsonb)
on conflict (lower(name)) do nothing;

insert into public.tenants (name, slug, subdomain, settings, plan_id)
values
  ('Amar Shopno', 'amarshopno', 'amarshopno', '{"currency": "USD", "locale": "en", "timezone": "UTC"}'::jsonb,
   (select id from public.plans where lower(name) = 'free'))
on conflict (slug) do nothing;