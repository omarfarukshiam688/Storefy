create table public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  slug text not null,
  description text,
  display_order integer not null default 0 check (display_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_tenant_slug_unique unique (tenant_id, slug)
);

create index idx_categories_tenant_id on public.categories (tenant_id);
create index idx_categories_tenant_slug on public.categories (tenant_id, slug);
create index idx_categories_display_order on public.categories (tenant_id, display_order) where is_active;

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
