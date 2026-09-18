alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Super admins can manage orders"
  on public.orders for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "Tenant admins can manage their orders"
  on public.orders for all to authenticated
  using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));

create policy "Super admins can manage order items"
  on public.order_items for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "Tenant admins can manage their order items"
  on public.order_items for all to authenticated
  using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));
