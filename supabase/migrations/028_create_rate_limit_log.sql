create table if not exists public.rate_limit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  identifier text not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_log_identifier_action on public.rate_limit_log(identifier, action, created_at);
create index if not exists idx_rate_limit_log_tenant_id on public.rate_limit_log(tenant_id);

alter publication supabase_realtime add table public.rate_limit_log;
