alter table public.categories enable row level security;
alter table public.products enable row level security;

create policy "Tenant members can read their categories"
  on public.categories for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy "Tenant members can insert categories"
  on public.categories for insert to authenticated
  with check (public.is_tenant_member(tenant_id));

create policy "Tenant members can update their categories"
  on public.categories for update to authenticated
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

create policy "Tenant members can delete their categories"
  on public.categories for delete to authenticated
  using (public.is_tenant_member(tenant_id));

create policy "Tenant members can read their products"
  on public.products for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy "Tenant members can insert products"
  on public.products for insert to authenticated
  with check (public.is_tenant_member(tenant_id));

create policy "Tenant members can update their products"
  on public.products for update to authenticated
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

create policy "Tenant members can delete their products"
  on public.products for delete to authenticated
  using (public.is_tenant_member(tenant_id));
