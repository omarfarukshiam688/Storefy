-- Immutable payment verification audit history
-- Every approval or rejection decision creates an append-only audit record.
-- Records cannot be modified or deleted through normal application access.
-- Audit records can ONLY be created via the trusted SECURITY DEFINER RPC
-- (approve_or_reject_payment). Direct INSERT by authenticated users is NOT permitted.

create table public.payment_verification_audit (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  admin_user_id uuid not null references auth.users (id) on delete restrict,
  decision text not null check (decision in ('approved', 'rejected')),
  previous_status text not null,
  new_status text not null,
  reason text,
  created_at timestamptz not null default now()
);

create index idx_payment_verification_audit_payment_id
  on public.payment_verification_audit (payment_id);
create index idx_payment_verification_audit_admin_user_id
  on public.payment_verification_audit (admin_user_id);
create index idx_payment_verification_audit_created_at
  on public.payment_verification_audit (created_at);

-- RLS
alter table public.payment_verification_audit enable row level security;

-- Super admins can read all audit records
create policy "Super admins can read payment verification audit"
  on public.payment_verification_audit for select to authenticated
  using (public.is_super_admin());

-- No INSERT policy for authenticated users - only the SECURITY DEFINER RPC can insert
-- No UPDATE or DELETE policies - audit records are immutable
-- Tenant users have no access to this table

-- Grants
-- SELECT for authenticated (Super Admin read via RLS)
-- NO INSERT for authenticated - only trusted RPC can create audit records
grant select on public.payment_verification_audit to authenticated;
grant all on public.payment_verification_audit to service_role;