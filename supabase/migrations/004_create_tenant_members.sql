create table public.tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'tenant_staff' check (role in ('tenant_admin', 'tenant_staff')),
  is_active boolean not null default true,
  invited_by uuid references auth.users (id) on delete set null,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_members_tenant_user_unique unique (tenant_id, user_id),
  constraint tenant_members_invited_by_self check (invited_by is null or invited_by <> user_id),
  constraint tenant_members_last_login_after_created check (last_login_at is null or last_login_at >= created_at)
);

create index idx_tenant_members_tenant_id on public.tenant_members (tenant_id);
create index idx_tenant_members_user_id on public.tenant_members (user_id);
create index idx_tenant_members_tenant_role on public.tenant_members (tenant_id, role) where is_active;

drop trigger if exists set_tenant_members_updated_at on public.tenant_members;
create trigger set_tenant_members_updated_at before update on public.tenant_members for each row execute function public.set_updated_at();