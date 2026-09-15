create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  slug text not null,
  description text,
  short_description text,
  sku text,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  stock_status text not null default 'in_stock' check (stock_status in ('in_stock', 'out_of_stock', 'preorder', 'backorder')),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  category_id uuid references public.categories (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_tenant_slug_unique unique (tenant_id, slug),
  constraint products_price_order check (compare_at_price is null or price <= compare_at_price)
);

create unique index idx_products_tenant_sku_unique on public.products (tenant_id, sku) where sku is not null;

create index idx_products_tenant_id on public.products (tenant_id);
create index idx_products_tenant_slug on public.products (tenant_id, slug);
create index idx_products_tenant_active on public.products (tenant_id, is_active);
create index idx_products_tenant_category on public.products (tenant_id, category_id);
create index idx_products_tenant_featured on public.products (tenant_id, is_featured) where is_featured;
create index idx_products_stock_status on public.products (tenant_id, stock_status);

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at before update on public.products for each row execute function public.set_updated_at();
