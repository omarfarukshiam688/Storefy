create table public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  order_number text not null,
  customer_name text not null check (btrim(customer_name) <> ''),
  phone_number text not null check (btrim(phone_number) <> ''),
  district text not null check (btrim(district) <> ''),
  delivery_address text not null check (btrim(delivery_address) <> ''),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_charge numeric(12,2) not null default 0 check (delivery_charge >= 0),
  payment_method text not null,
  order_status text not null default 'pending',
  customer_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name_snapshot text not null,
  product_price numeric(12,2) not null check (product_price >= 0),
  weight numeric(12,2) not null default 0 check (weight >= 0),
  quantity integer not null default 1 check (quantity > 0),
  item_total numeric(12,2) not null check (item_total >= 0),
  created_at timestamptz not null default now()
);

create index idx_orders_tenant_id on public.orders (tenant_id);
create index idx_orders_tenant_status on public.orders (tenant_id, order_status);
create index idx_order_items_tenant_id on public.order_items (tenant_id);
create index idx_order_items_order_id on public.order_items (order_id);
create index idx_order_items_product_id on public.order_items (product_id);

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
