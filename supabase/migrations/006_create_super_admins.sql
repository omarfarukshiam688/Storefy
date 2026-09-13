create table public.super_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.super_admins sa where sa.user_id = auth.uid()
  )
$$;

create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.tenant_members tm
    join public.tenants t on t.id = tm.tenant_id
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and tm.is_active
      and t.is_active
  ) or public.is_super_admin()
$$;

create or replace function public.is_tenant_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.is_super_admin() or exists (
    select 1 from public.tenant_members tm
    join public.tenants t on t.id = tm.tenant_id
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and tm.role = 'tenant_admin'
      and tm.is_active
      and t.is_active
  )
$$;

create or replace function public.auth_user_email(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select au.email from auth.users au where au.id = p_user_id
$$;

create or replace function public.validate_profile_default_tenant()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.default_tenant_id is not null and not public.is_tenant_member(new.default_tenant_id) then
    raise exception 'default_tenant_id must reference a tenant the user is an active member of';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_profile_default_tenant on public.profiles;
create trigger validate_profile_default_tenant before insert or update on public.profiles for each row execute function public.validate_profile_default_tenant();

revoke execute on function public.is_super_admin() from public;
revoke execute on function public.is_tenant_member(uuid) from public;
revoke execute on function public.is_tenant_admin(uuid) from public;
revoke execute on function public.auth_user_email(uuid) from public;
revoke execute on function public.validate_profile_default_tenant() from public;
grant execute on function public.is_super_admin() to authenticated, service_role;
grant execute on function public.is_tenant_member(uuid) to authenticated, service_role;
grant execute on function public.is_tenant_admin(uuid) to authenticated, service_role;
grant execute on function public.auth_user_email(uuid) to authenticated, service_role;
grant execute on function public.validate_profile_default_tenant() to authenticated, service_role;