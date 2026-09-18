-- Fix: Allow tenant admins to update their tenant (including settings JSONB)
-- Resolves "permission denied for table tenants" on branding save

drop policy if exists "Tenant admins can update their tenant" on public.tenants;

create policy "Tenant admins can update their tenant"
  on public.tenants for update to authenticated
  using (public.is_tenant_admin(id))
  with check (public.is_tenant_admin(id));