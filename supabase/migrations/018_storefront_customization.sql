create table public.tenant_storefront_sections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  section_key text not null,
  is_enabled boolean not null default true,
  display_order integer not null default 0,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_storefront_sections_tenant_section_unique unique (tenant_id, section_key)
);

create index idx_tenant_storefront_sections_tenant on public.tenant_storefront_sections (tenant_id);

drop trigger if exists set_tenant_storefront_sections_updated_at on public.tenant_storefront_sections;
create trigger set_tenant_storefront_sections_updated_at before update on public.tenant_storefront_sections for each row execute function public.set_updated_at();

alter table public.tenant_storefront_sections enable row level security;

create policy "Tenant admins can manage their storefront sections"
  on public.tenant_storefront_sections for all to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

grant select, insert, update, delete on public.tenant_storefront_sections to authenticated;
grant all on public.tenant_storefront_sections to service_role;
