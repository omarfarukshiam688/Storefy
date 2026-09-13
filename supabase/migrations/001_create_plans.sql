create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  description text,
  price_monthly numeric(10,2) not null check (price_monthly >= 0),
  product_limit integer not null check (product_limit >= 0),
  order_limit integer not null check (order_limit >= 0),
  storage_limit_bytes bigint not null check (storage_limit_bytes >= 0),
  features jsonb not null default '{}'::jsonb check (jsonb_typeof(features) = 'object'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_plans_name_lower on public.plans (lower(name));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_plans_updated_at on public.plans;
create trigger set_plans_updated_at before update on public.plans for each row execute function public.set_updated_at();