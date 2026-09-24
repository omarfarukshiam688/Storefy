-- Fix rate_limit_log isolation: enable RLS and add tenant-scoped policies.

alter table public.rate_limit_log enable row level security;

create policy "Tenant members can read their rate limit log"
  on public.rate_limit_log for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy "Service role can manage rate limit log"
  on public.rate_limit_log for all to service_role
  using (true)
  with check (true);
