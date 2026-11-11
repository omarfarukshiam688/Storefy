-- Subscription records for tenant billing lifecycle
-- Supports monthly prepaid billing, trials, grace periods, cancellations, and scheduled changes
-- Multiple subscriptions per tenant allowed to preserve full history

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  plan_id uuid not null references public.plans (id) on delete restrict,
  status text not null check (status in (
    'trialing',
    'active',
    'past_due',
    'suspended',
    'canceled',
    'expired'
  )),
  billing_cycle_anchor timestamptz not null,
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  trial_start timestamptz,
  trial_end timestamptz,
  grace_period_end timestamptz,
  canceled_at timestamptz,
  cancel_at_period_end boolean not null default false,
  suspended_at timestamptz,
  ended_at timestamptz,
  scheduled_plan_id uuid references public.plans (id) on delete set null,
  scheduled_plan_change_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_trial_dates_check check (
    trial_start is null or trial_end is null or trial_start < trial_end
  ),
  constraint subscriptions_period_check check (current_period_start < current_period_end),
  constraint subscriptions_scheduled_change_check check (
    scheduled_plan_id is null or scheduled_plan_change_at is not null
  ),
  constraint subscriptions_grace_check check (
    grace_period_end is null or current_period_end <= grace_period_end
  ),
  constraint subscriptions_ended_check check (
    ended_at is null or status in ('canceled', 'expired')
  )
);

-- Only one active subscription per tenant at a time (trialing, active, past_due, suspended)
create unique index idx_subscriptions_one_active_per_tenant
  on public.subscriptions (tenant_id)
  where status in ('trialing', 'active', 'past_due', 'suspended');

create index idx_subscriptions_tenant_id on public.subscriptions (tenant_id);
create index idx_subscriptions_status on public.subscriptions (status);
create index idx_subscriptions_plan_id on public.subscriptions (plan_id);
create index idx_subscriptions_current_period_end on public.subscriptions (current_period_end);
create index idx_subscriptions_billing_cycle_anchor on public.subscriptions (billing_cycle_anchor);
create index idx_subscriptions_ended_at on public.subscriptions (ended_at);

-- Updated at trigger
drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

-- RLS
alter table public.subscriptions enable row level security;

-- Super admins can manage all subscriptions
create policy "Super admins can manage subscriptions"
  on public.subscriptions for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Tenant admins can read their tenant's subscription
create policy "Tenant admins can read their subscription"
  on public.subscriptions for select to authenticated
  using (public.is_tenant_admin(tenant_id));

-- Grants
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;