create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  subdomain text unique check (subdomain is null or subdomain ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  custom_domain text unique check (custom_domain is null or lower(custom_domain) = custom_domain),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  plan_id uuid not null references public.plans (id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_tenants_updated_at on public.tenants;
create trigger set_tenants_updated_at before update on public.tenants for each row execute function public.set_updated_at();