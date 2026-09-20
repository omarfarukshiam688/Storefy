alter table public.reviews enable row level security;

create policy "Super admins can manage reviews"
  on public.reviews for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Tenant admins can manage their reviews"
  on public.reviews for all to authenticated
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

grant select, insert, update, delete on public.reviews to authenticated;
