grant usage on schema public to authenticated, service_role;

grant select on public.plans to authenticated;
grant all on public.plans to service_role;

grant select on public.tenants to authenticated;
grant all on public.tenants to service_role;

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

grant select, insert, update, delete on public.tenant_members to authenticated;
grant all on public.tenant_members to service_role;

grant select, insert, update, delete on public.tenant_invitations to authenticated;
grant all on public.tenant_invitations to service_role;

grant select, insert, delete on public.super_admins to authenticated;
grant all on public.super_admins to service_role;