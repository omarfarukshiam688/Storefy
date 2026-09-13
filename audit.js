import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://axxfnhrldbdmuxtklxsa.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_RYL_LC8rz8d1mN_fe5pd-Q_uofJAKlx';

const supabase = createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function audit() {
  // Create a temporary function to expose pg_policies
  const createPoliciesFn = `
    create or replace function public.get_pg_policies()
    returns table (
      schemaname text,
      tablename text,
      policyname text,
      permissive text,
      roles text[],
      cmd text,
      qual text,
      with_check text
    )
    language sql
    security definer
    set search_path = pg_catalog, public
    as $$
      select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      from pg_policies
      where schemaname = 'public'
    $$;
  `;

  const createPrivilegesFn = `
    create or replace function public.get_table_privileges()
    returns table (
      grantee text,
      table_schema text,
      table_name text,
      privilege_type text,
      is_grantable text
    )
    language sql
    security definer
    set search_path = pg_catalog, information_schema
    as $$
      select grantee, table_schema, table_name, privilege_type, is_grantable
      from information_schema.table_privileges
      where table_schema = 'public'
        and table_name in ('plans', 'tenants', 'profiles', 'tenant_members', 'tenant_invitations', 'super_admins')
    $$;
  `;

  const createRolesFn = `
    create or replace function public.get_pg_roles()
    returns table (
      rolname text,
      rolsuper boolean,
      rolinherit boolean,
      rolcreaterole boolean,
      rolcanlogin boolean
    )
    language sql
    security definer
    set search_path = pg_catalog
    as $$
      select rolname, rolsuper, rolinherit, rolcreaterole, rolcanlogin
      from pg_roles
      where rolname in ('anon', 'authenticated', 'service_role')
    $$;
  `;

  // Create functions
  console.log('Creating helper functions...');
  const { error: e1 } = await supabase.rpc('exec', { sql: createPoliciesFn });
  if (e1) console.error('Error creating policies fn:', e1);
  
  const { error: e2 } = await supabase.rpc('exec', { sql: createPrivilegesFn });
  if (e2) console.error('Error creating privileges fn:', e2);
  
  const { error: e3 } = await supabase.rpc('exec', { sql: createRolesFn });
  if (e3) console.error('Error creating roles fn:', e3);

  // Query policies
  console.log('\n=== pg_policies ===');
  const { data: policies, error: policiesError } = await supabase
    .rpc('get_pg_policies');
  
  if (policiesError) {
    console.error('Error fetching policies:', policiesError);
  } else {
    console.log(JSON.stringify(policies, null, 2));
  }

  // Query privileges
  console.log('\n=== information_schema.table_privileges ===');
  const { data: privileges, error: privilegesError } = await supabase
    .rpc('get_table_privileges');
  
  if (privilegesError) {
    console.error('Error fetching privileges:', privilegesError);
  } else {
    console.log(JSON.stringify(privileges, null, 2));
  }

  // Query roles
  console.log('\n=== pg_roles ===');
  const { data: roles, error: rolesError } = await supabase
    .rpc('get_pg_roles');
  
  if (rolesError) {
    console.error('Error fetching roles:', rolesError);
  } else {
    console.log(JSON.stringify(roles, null, 2));
  }

  // Cleanup
  console.log('\n=== Cleaning up ===');
  await supabase.rpc('exec', { sql: 'drop function if exists public.get_pg_policies()' });
  await supabase.rpc('exec', { sql: 'drop function if exists public.get_table_privileges()' });
  await supabase.rpc('exec', { sql: 'drop function if exists public.get_pg_roles()' });
  console.log('Cleanup complete');
}

audit().catch(console.error);
