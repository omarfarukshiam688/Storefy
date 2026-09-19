create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  email text,
  phone text not null,
  address text,
  district text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers
  drop constraint if exists customers_status_check;

alter table public.customers
  add constraint customers_status_check
    check (status in ('active', 'inactive', 'blocked'));

create unique index if not exists idx_customers_tenant_phone
  on public.customers (tenant_id, phone);

create index if not exists idx_customers_tenant_email
  on public.customers (tenant_id, email);

create index if not exists idx_customers_tenant_name
  on public.customers (tenant_id, name);

create index if not exists idx_customers_tenant_status
  on public.customers (tenant_id, status);

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

alter publication supabase_realtime add table public.customers;
