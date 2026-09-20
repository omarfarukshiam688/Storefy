create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  review_text text not null check (btrim(review_text) <> ''),
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_status_check check (status in ('pending', 'approved', 'rejected', 'hidden')),
  constraint reviews_tenant_order_product_unique unique (tenant_id, order_id, product_id)
);

create index if not exists idx_reviews_tenant_id on public.reviews(tenant_id);
create index if not exists idx_reviews_product_id on public.reviews(product_id);
create index if not exists idx_reviews_customer_id on public.reviews(customer_id);
create index if not exists idx_reviews_order_id on public.reviews(order_id);
create index if not exists idx_reviews_status on public.reviews(status);
create index if not exists idx_reviews_tenant_product_status on public.reviews(tenant_id, product_id, status) where status = 'approved';
create index if not exists idx_reviews_tenant_order_product on public.reviews(tenant_id, order_id, product_id);

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

alter publication supabase_realtime add table public.reviews;
