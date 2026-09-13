alter table public.plans enable row level security;
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_members enable row level security;
alter table public.tenant_invitations enable row level security;
alter table public.super_admins enable row level security;

create policy "Super admins can manage plans"
  on public.plans for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "Tenant members can read their plan"
  on public.plans for select to authenticated
  using (
    exists (select 1 from public.tenants t where t.plan_id = plans.id and public.is_tenant_member(t.id))
  );

create policy "Super admins can manage tenants"
  on public.tenants for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "Tenant members can read their tenant"
  on public.tenants for select to authenticated
  using (public.is_tenant_member(id));

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and email = public.auth_user_email(id));

create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check (id = auth.uid() and email = public.auth_user_email(id));

create policy "Super admins can manage profiles"
  on public.profiles for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "Super admins can manage tenant members"
  on public.tenant_members for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "Tenant admins can manage their tenant members"
  on public.tenant_members for all to authenticated
  using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));

create policy "Users can read their own memberships"
  on public.tenant_members for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own membership"
  on public.tenant_members for insert to authenticated
  with check (user_id = auth.uid());

create policy "Super admins can manage tenant invitations"
  on public.tenant_invitations for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "Tenant admins can manage their tenant invitations"
  on public.tenant_invitations for all to authenticated
  using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));

create policy "Users can read invitations sent to them"
  on public.tenant_invitations for select to authenticated
  using (lower(email) = lower(public.auth_user_email(auth.uid())));

create policy "Super admins can manage super admins"
  on public.super_admins for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());