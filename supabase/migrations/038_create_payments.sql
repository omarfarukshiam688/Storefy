-- Payment/transaction records for billing history and audit trail
-- Supports multiple providers, idempotency, manual verification, and refunds

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  purpose text not null check (purpose in (
    'subscription_initial',
    'subscription_renewal',
    'subscription_upgrade',
    'subscription_downgrade',
    'manual_topup',
    'refund'
  )),
  provider text not null check (provider in (
    'bkash',
    'sslcommerz',
    'stripe',
    'manual',
    'system'
  )),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'BDT' check (length(currency) = 3),
  status text not null check (status in (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded',
    'verification_required'
  )),
  provider_transaction_id text,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  failure_reason text,
  verification_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_payments_tenant_id on public.payments (tenant_id);
create index idx_payments_subscription_id on public.payments (subscription_id);
create index idx_payments_provider_transaction_id on public.payments (provider_transaction_id);
create index idx_payments_idempotency_key on public.payments (idempotency_key);
create index idx_payments_status on public.payments (status);
create index idx_payments_purpose on public.payments (purpose);
create index idx_payments_created_at on public.payments (created_at);

-- Updated at trigger
drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at before update on public.payments for each row execute function public.set_updated_at();

-- RLS
alter table public.payments enable row level security;

-- Super admins can manage all payments
create policy "Super admins can manage payments"
  on public.payments for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Tenant admins can read their tenant's payments
create policy "Tenant admins can read their payments"
  on public.payments for select to authenticated
  using (public.is_tenant_admin(tenant_id));

-- Grants
grant select on public.payments to authenticated;
grant all on public.payments to service_role;