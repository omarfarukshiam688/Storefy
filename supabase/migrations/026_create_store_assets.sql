create table public.store_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  storage_path text not null unique,
  asset_type text not null check (asset_type in ('logo', 'hero', 'about', 'favicon')),
  file_size bigint not null check (file_size > 0),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml')),
  original_filename text not null check (btrim(original_filename) <> '' and length(original_filename) <= 255),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_assets_tenant_type_unique unique (tenant_id, asset_type)
);

create index idx_store_assets_tenant_id on public.store_assets (tenant_id);

drop trigger if exists set_store_assets_updated_at on public.store_assets;
create trigger set_store_assets_updated_at before update on public.store_assets for each row execute function public.set_updated_at();

alter table public.store_assets enable row level security;

create policy "Tenant admins can manage their store assets"
  on public.store_assets for all to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

grant select, insert, update, delete on public.store_assets to authenticated;
grant all on public.store_assets to service_role;
