-- Secure tenant creation via SECURITY DEFINER RPC.
--
-- This function allows an authenticated user to create their first tenant
-- atomically, while enforcing business rules at the database level.
--
-- Security model:
--   - The caller's identity is derived exclusively from auth.uid().
--   - The function rejects unauthenticated callers.
--   - The function prevents users with an existing active tenant membership
--     from creating another one.
--   - INSERT/UPDATE/DELETE on tenants remains restricted to super admins
--     through the existing RLS policies.
--   - tenant_members and profiles updates happen inside the same atomic
--     transaction as the tenant creation.

create or replace function public.create_tenant_for_user(
  p_name text,
  p_slug text,
  p_plan_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
begin
  -- Reject unauthenticated callers
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Enforce one active tenant per user
  if exists (
    select 1
    from public.tenant_members tm
    join public.tenants t on t.id = tm.tenant_id
    where tm.user_id = v_user_id
      and tm.is_active
      and t.is_active
  ) then
    raise exception 'User already has an active tenant';
  end if;

  -- Insert the tenant
  insert into public.tenants (name, slug, plan_id, settings)
  values (
    p_name,
    p_slug,
    p_plan_id,
    jsonb_build_object(
      'display_name', p_name,
      'description', '',
      'contact_email', null,
      'contact_phone', null,
      'address', null,
      'currency', 'USD',
      'timezone', 'UTC',
      'logo_url', null,
      'favicon_url', null
    )
  )
  returning id into v_tenant_id;

  -- Insert the tenant membership
  insert into public.tenant_members (tenant_id, user_id, role)
  values (v_tenant_id, v_user_id, 'tenant_admin');

  -- Set the user's default tenant
  update public.profiles
  set default_tenant_id = v_tenant_id
  where id = v_user_id;

  return v_tenant_id;
end;
$$;

revoke execute on function public.create_tenant_for_user(text, text, uuid) from public;
grant execute on function public.create_tenant_for_user(text, text, uuid) to authenticated, service_role;
