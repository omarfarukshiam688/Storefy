-- Tenant RLS Test Strategy
-- Requires: Supabase CLI, Docker, basejump-supabase_test_helpers extension
-- Run with: supabase test db

begin;
select plan(12);

-- Create test users
select tests.create_supabase_user('user_a', 'user-a@test.com');
select tests.create_supabase_user('user_b', 'user-b@test.com');
select tests.create_supabase_user('super_admin', 'super-admin@test.com');

-- Create test plans and tenants as service role
select tests.authenticate_as_service_role();
insert into public.plans (name, description, price_monthly, product_limit, order_limit, storage_limit_bytes, features)
values ('Test Plan', 'Test', 0, 100, 1000, 1073741824, '{}'::jsonb)
on conflict (lower(name)) do nothing;

insert into public.tenants (name, slug, subdomain, settings, plan_id)
values
  ('Tenant A', 'tenant-a', 'tenant-a', '{}'::jsonb, (select id from public.plans where lower(name) = 'test plan')),
  ('Tenant B', 'tenant-b', 'tenant-b', '{}'::jsonb, (select id from public.plans where lower(name) = 'test plan'))
on conflict (slug) do nothing;

-- Add super admin
insert into public.super_admins (user_id)
values (tests.get_supabase_uid('super_admin'));

-- Add tenant members
insert into public.tenant_members (tenant_id, user_id, role)
values
  ((select id from public.tenants where slug = 'tenant-a'), tests.get_supabase_uid('user_a'), 'tenant_admin'),
  ((select id from public.tenants where slug = 'tenant-b'), tests.get_supabase_uid('user_b'), 'tenant_admin')
on conflict do nothing;

-- Test: Tenant A user can read Tenant A
select tests.authenticate_as('user-a@test.com');
select results_eq(
  'select count(*) from public.tenants where slug = ''tenant-a''',
  ARRAY[1::bigint],
  'Tenant A user can read Tenant A'
);

-- Test: Tenant A user cannot read Tenant B
select results_eq(
  'select count(*) from public.tenants where slug = ''tenant-b''',
  ARRAY[0::bigint],
  'Tenant A user cannot read Tenant B'
);

-- Test: Tenant A user cannot insert into Tenant B
select throws_ok(
  $$ insert into public.tenant_members (tenant_id, user_id, role) values ((select id from public.tenants where slug = 'tenant-b'), tests.get_supabase_uid('user_a'), 'tenant_staff') $$,
  '42501',
  'new row violates row-level security policy for table "tenant_members"',
  'Tenant A user cannot insert into Tenant B'
);

-- Test: Tenant A user can read own membership
select results_eq(
  'select count(*) from public.tenant_members where user_id = auth.uid()',
  ARRAY[1::bigint],
  'Tenant A user can read own membership'
);

-- Test: Super admin can read all tenants
select tests.authenticate_as('super-admin@test.com');
select results_eq(
  'select count(*) from public.tenants',
  ARRAY[2::bigint],
  'Super admin can read all tenants'
);

-- Test: Unauthenticated user cannot read tenants
select tests.clear_authentication();
select results_eq(
  'select count(*) from public.tenants',
  ARRAY[0::bigint],
  'Unauthenticated user cannot read tenants'
);

select * from finish();
rollback;