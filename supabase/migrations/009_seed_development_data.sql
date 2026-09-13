insert into public.plans (name, description, price_monthly, product_limit, order_limit, storage_limit_bytes, features)
values
  ('Free', 'Free tier for small businesses getting started.', 0, 50, 100, 1073741824, '{"analytics": true, "custom_domain": false, "team_members": 2}'::jsonb),
  ('Pro', 'Pro tier for growing businesses.', 2900, 500, 5000, 5368709120, '{"analytics": true, "custom_domain": true, "team_members": 10}'::jsonb)
on conflict (lower(name)) do nothing;