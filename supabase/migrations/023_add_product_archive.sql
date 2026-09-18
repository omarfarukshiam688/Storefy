alter table public.products add column if not exists is_archived boolean not null default false;

create index if not exists idx_products_tenant_archived on public.products (tenant_id, is_archived);
