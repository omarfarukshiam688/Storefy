-- Update Free plan limits to match current intended configuration.
update public.plans
set product_limit = 20,
    storage_limit_bytes = 209715200
where lower(name) = 'free';
