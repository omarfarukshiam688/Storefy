create table public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email text not null check (btrim(email) <> '' and lower(email) = email),
  role text not null default 'tenant_staff' check (role in ('tenant_admin', 'tenant_staff')),
  token text not null unique default gen_random_uuid()::text,
  expires_at timestamptz not null check (expires_at > created_at),
  accepted_at timestamptz check (accepted_at is null or (accepted_at >= created_at and accepted_at <= expires_at)),
  created_at timestamptz not null default now()
);

create unique index idx_tenant_invitations_active_email on public.tenant_invitations (tenant_id, lower(email)) where accepted_at is null;
create index idx_tenant_invitations_tenant_id on public.tenant_invitations (tenant_id);
create index idx_tenant_invitations_token on public.tenant_invitations (token);
create index idx_tenant_invitations_expires_at on public.tenant_invitations (expires_at);