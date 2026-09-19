drop policy if exists "Tenant members can view their customers" on public.customers;
drop policy if exists "Tenant admins can manage their customers" on public.customers;

create policy "Tenant members can view their customers"
  on public.customers for select to authenticated
  using (
    exists (
      select 1 from public.tenant_members
      where tenant_members.tenant_id = customers.tenant_id
        and tenant_members.user_id = auth.uid()
        and tenant_members.is_active = true
    )
  );

create policy "Tenant admins can manage their customers"
  on public.customers for all to authenticated
  using (
    exists (
      select 1 from public.tenant_members
      where tenant_members.tenant_id = customers.tenant_id
        and tenant_members.user_id = auth.uid()
        and tenant_members.is_active = true
        and tenant_members.role = 'tenant_admin'
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members
      where tenant_members.tenant_id = customers.tenant_id
        and tenant_members.user_id = auth.uid()
        and tenant_members.is_active = true
        and tenant_members.role = 'tenant_admin'
    )
  );

grant select on public.customers to authenticated;
grant insert, update, delete on public.customers to authenticated;



