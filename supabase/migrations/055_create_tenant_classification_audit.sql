-- Create tenant classification audit table for Super Admin suspension reason changes
-- Migration 055: Depends on 050 (suspension_reason column) and 053 (subscription_change_audit pattern)

-- 1. Create tenant_classification_audit table (idempotent)
create table if not exists public.tenant_classification_audit (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  admin_user_id uuid not null references auth.users (id) on delete restrict,
  previous_suspension_reason text,
  new_suspension_reason text not null check (new_suspension_reason in ('subscription_expiry', 'administrative')),
  classification_reason text,
  subscription_evidence jsonb,
  created_at timestamptz not null default now()
);

-- 2. Indexes for efficient queries
create index if not exists idx_tenant_classification_audit_tenant_id
  on public.tenant_classification_audit (tenant_id);

create index if not exists idx_tenant_classification_audit_admin_user_id
  on public.tenant_classification_audit (admin_user_id);

create index if not exists idx_tenant_classification_audit_created_at
  on public.tenant_classification_audit (created_at);

-- 3. RLS
alter table public.tenant_classification_audit enable row level security;

-- Super admins can read all audit records
drop policy if exists "Super admins can read tenant classification audit"
  on public.tenant_classification_audit;
create policy "Super admins can read tenant classification audit"
  on public.tenant_classification_audit for select to authenticated
  using (public.is_super_admin());

-- 4. Grants
grant select on public.tenant_classification_audit to authenticated;
grant all on public.tenant_classification_audit to service_role;