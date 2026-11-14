-- ============================================================================
-- STOREfy PRODUCTION MIGRATION PREFLIGHT DIAGNOSTIC
-- READ-ONLY: SELECT / catalog inspection only. No DML, DDL, or function invocation.
-- Execute in Supabase Dashboard SQL Editor.
-- ============================================================================

-- ============================================================================
-- A. MIGRATION HISTORY AVAILABILITY
-- ============================================================================

-- A1. Supabase migration tracking table (if exists)
SELECT
  'supabase_migrations.schema_migrations' AS object_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'supabase_migrations' AND c.relname = 'schema_migrations'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END AS status;

-- If migration history table exists, uncomment to inspect:
-- SELECT version, name, applied_at FROM supabase_migrations.schema_migrations ORDER BY version;

-- A2. Any other migration tracking tables
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE tablename LIKE '%migration%' OR tablename LIKE '%schema_version%';

-- ============================================================================
-- B. REQUIRED TABLES EXISTENCE AND BASIC STRUCTURE
-- ============================================================================

-- B1. Core tables existence
SELECT
  schemaname,
  tablename,
  CASE WHEN tablename IN ('plans','subscriptions','payments','tenants','payment_verification_audit','subscription_change_audit','tenant_classification_audit')
       THEN 'REQUIRED' ELSE 'OTHER' END AS category
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('plans','subscriptions','payments','tenants','payment_verification_audit','subscription_change_audit','tenant_classification_audit');

-- B2. Detailed column inspection for core tables
-- public.plans
SELECT
  a.attname AS column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
  CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable,
  a.attnum AS ordinal_position
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE n.nspname = 'public' AND c.relname = 'plans' AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attnum;

-- public.subscriptions
SELECT
  a.attname AS column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
  CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable,
  a.attnum AS ordinal_position
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE n.nspname = 'public' AND c.relname = 'subscriptions' AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attnum;

-- public.payments
SELECT
  a.attname AS column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
  CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable,
  a.attnum AS ordinal_position
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE n.nspname = 'public' AND c.relname = 'payments' AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attnum;

-- public.tenants
SELECT
  a.attname AS column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
  CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable,
  a.attnum AS ordinal_position
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE n.nspname = 'public' AND c.relname = 'tenants' AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attnum;

-- ============================================================================
-- C. REQUIRED COLUMNS - DETAILED CHECK
-- ============================================================================

-- C1. plans: id, name, price_monthly, is_active
SELECT
  'plans' AS table_name,
  a.attname AS column_name,
  CASE WHEN a.attname IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS status,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
  CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable
FROM (
  SELECT * FROM generate_series(1,4) AS i
) g
JOIN LATERAL (
  SELECT * FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'plans'
) c ON true
JOIN LATERAL (
  SELECT * FROM pg_attribute a
  WHERE a.attrelid = c.oid
    AND a.attname IN ('id','name','price_monthly','is_active')
    AND a.attnum > 0 AND NOT a.attisdropped
) a ON true
ORDER BY a.attnum;

-- C2. subscriptions: critical columns for downgrade logic
SELECT
  'subscriptions' AS table_name,
  a.attname AS column_name,
  CASE WHEN a.attname IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS status,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
  CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable
FROM (
  SELECT * FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'subscriptions'
) c
JOIN LATERAL (
  SELECT * FROM pg_attribute a
  WHERE a.attrelid = c.oid
    AND a.attname IN ('id','tenant_id','plan_id','status','current_period_start','current_period_end','grace_period_end',
                       'scheduled_plan_id','scheduled_plan_change_at','downgrade_request_id',
                       'cancel_at_period_end','canceled_at','suspended_at','ended_at',
                       'trial_start','trial_end','billing_cycle_anchor')
    AND a.attnum > 0 AND NOT a.attisdropped
) a ON true
ORDER BY a.attnum;

-- C3. payments: critical columns for payment correlation
SELECT
  'payments' AS table_name,
  a.attname AS column_name,
  CASE WHEN a.attname IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS status,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
  CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable
FROM (
  SELECT * FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'payments'
) c
JOIN LATERAL (
  SELECT * FROM pg_attribute a
  WHERE a.attrelid = c.oid
    AND a.attname IN ('id','tenant_id','subscription_id','target_plan_id','purpose','status','amount',
                       'expected_amount','currency','provider','provider_transaction_id','idempotency_key',
                       'metadata','renewal_period_start','renewal_period_end','failure_reason',
                       'verification_notes','verified_at','verified_by','created_at')
    AND a.attnum > 0 AND NOT a.attisdropped
) a ON true
ORDER BY a.attnum;

-- C4. tenants: suspension_reason
SELECT
  'tenants' AS table_name,
  a.attname AS column_name,
  CASE WHEN a.attname IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS status,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
  CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable
FROM (
  SELECT * FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'tenants'
) c
JOIN LATERAL (
  SELECT * FROM pg_attribute a
  WHERE a.attrelid = c.oid
    AND a.attname IN ('id','name','slug','is_active','suspension_reason')
    AND a.attnum > 0 AND NOT a.attisdropped
) a ON true
ORDER BY a.attnum;

-- ============================================================================
-- D. MIGRATION 049 — UNIQUE INDEX AND DUPLICATE PLAN NAMES
-- ============================================================================

-- D1. Check idx_plans_lower_name exists and is UNIQUE
SELECT
  'idx_plans_lower_name' AS index_name,
  CASE WHEN i.oid IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS status,
  CASE WHEN i.oid IS NOT NULL THEN i.indisunique ELSE NULL END AS is_unique,
  CASE WHEN i.oid IS NOT NULL THEN i.indisvalid ELSE NULL END AS is_valid,
  pg_catalog.pg_get_indexdef(i.oid) AS index_definition
FROM (VALUES ('idx_plans_lower_name')) v(index_name)
LEFT JOIN pg_class i
  ON i.relname = v.index_name
 AND i.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LEFT JOIN pg_index idx ON idx.indexrelid = i.oid
LEFT JOIN pg_class t ON t.oid = idx.indrelid AND t.relname = 'plans'
LEFT JOIN pg_namespace n ON n.oid = t.relnamespace AND n.nspname = 'public';

-- D2. Verify the index expression is exactly lower(name)
SELECT
  i.relname AS index_name,
  a.attname AS indexed_column,
  pg_catalog.pg_get_indexdef(i.oid) AS index_definition
FROM pg_index idx
JOIN pg_class i ON i.oid = idx.indexrelid
JOIN pg_class t ON t.oid = idx.indrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = idx.indkey[0]
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'plans'
  AND i.relname = 'idx_plans_lower_name';

-- D3. Check for duplicate case-insensitive plan names (using lower(name))
SELECT
  lower(name) AS lower_name,
  array_agg(name) AS original_names,
  array_agg(id) AS ids,
  count(*) AS duplicate_count
FROM public.plans
GROUP BY lower(name)
HAVING count(*) > 1;

-- D4. Current plan records and prices
SELECT
  id, name, price_monthly, is_active,
  CASE
    WHEN lower(name) = 'starter' AND price_monthly = 299 AND is_active THEN 'OK'
    WHEN lower(name) = 'growth' AND price_monthly = 699 AND is_active THEN 'OK'
    WHEN lower(name) = 'business' AND price_monthly = 1299 AND is_active THEN 'OK'
    WHEN lower(name) IN ('free','scale','pro') AND NOT is_active THEN 'OK (deactivated)'
    ELSE 'UNEXPECTED'
  END AS validation
FROM public.plans
ORDER BY price_monthly;

-- ============================================================================
-- E. MIGRATION 050 — SUSPENSION_REASON
-- ============================================================================

-- E1. suspension_reason column and constraint
SELECT
  a.attname AS column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
  CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable,
  pg_catalog.pg_get_expr(ad.adbin, ad.adrelid) AS column_default
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid
LEFT JOIN pg_attrdef ad ON ad.adrelid = c.oid AND ad.adnum = a.attnum
WHERE n.nspname = 'public' AND c.relname = 'tenants' AND a.attname = 'suspension_reason'
  AND a.attnum > 0 AND NOT a.attisdropped;

-- E2. CHECK constraint
SELECT conname AS constraint_name, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.tenants'::regclass
  AND conname LIKE '%suspension%';

-- E3. Index
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'tenants' AND indexname = 'idx_tenants_suspension_reason';

-- E4. Tenant counts by is_active and suspension_reason
SELECT
  is_active,
  suspension_reason,
  COUNT(*) AS tenant_count
FROM public.tenants
GROUP BY is_active, suspension_reason
ORDER BY is_active, suspension_reason;

-- E5. Inactive tenants with NULL suspension_reason (requires manual reconciliation)
SELECT
  t.id, t.name, t.slug, t.suspension_reason,
  s.id AS subscription_id, s.status AS subscription_status,
  s.current_period_end, s.grace_period_end,
  p.name AS plan_name, p.price_monthly
FROM public.tenants t
LEFT JOIN public.subscriptions s ON s.tenant_id = t.id
LEFT JOIN public.plans p ON p.id = s.plan_id
WHERE t.is_active = false
  AND t.suspension_reason IS NULL
ORDER BY t.name;

-- ============================================================================
-- F. MIGRATION 053 — DOWNGRADE CORRELATION AND APPROVAL RPC
-- ============================================================================

-- F1. subscriptions.downgrade_request_id column
SELECT
  a.attname AS column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
  CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'subscriptions' AND a.attname = 'downgrade_request_id'
  AND a.attnum > 0 AND NOT a.attisdropped;

-- F2. Index on downgrade_request_id
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'subscriptions' AND indexname = 'idx_subscriptions_downgrade_request_id';

-- F3. approve_or_reject_payment function existence and signature
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_functiondef(p.oid) AS full_definition,
  CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security,
  COALESCE(
    (SELECT unnest(proconfig) FROM pg_proc WHERE oid = p.oid AND proconfig IS NOT NULL AND unnest(proconfig) LIKE 'search_path=%'),
    'NOT SET'
  ) AS search_path_setting
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'approve_or_reject_payment';

-- F4. Function grants
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND routine_name = 'approve_or_reject_payment';

-- F5. subscription_change_audit table
SELECT
  'subscription_change_audit' AS table_name,
  CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname = 'subscription_change_audit' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN 'EXISTS' ELSE 'MISSING' END AS status;

-- F4. audit table columns
SELECT a.attname, pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
       CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'subscription_change_audit'
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attnum;

-- F5. Idempotency index
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'subscription_change_audit' AND indexname = 'idx_subscription_change_audit_idempotent';

-- F6. RLS and policies
SELECT c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'subscription_change_audit';

SELECT polname, polcmd,
       array(SELECT rolname FROM pg_roles r WHERE r.oid = ANY(polroles)) AS roles,
       pg_get_expr(polqual, polrelid) AS using_expr
FROM pg_policy
JOIN pg_class c ON c.oid = polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'subscription_change_audit';

-- F7. apply_subscription_downgrades() RPC
SELECT
  p.proname, pg_get_function_identity_arguments(p.oid) AS identity_args,
  pg_get_functiondef(p.oid) AS full_definition,
  CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security,
  COALESCE((SELECT unnest(proconfig) FROM pg_proc WHERE oid = p.oid AND proconfig IS NOT NULL AND unnest(proconfig) LIKE 'search_path=%'), 'NOT SET') AS search_path_setting
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'apply_subscription_downgrades';

-- F8. RPC grants
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND routine_name = 'apply_subscription_downgrades';

-- ============================================================================
-- G. MIGRATION 054 — DOWNGRADE PAYMENT RPC
-- ============================================================================

-- G1. create_subscription_downgrade_payment function
SELECT
  p.proname, pg_get_function_identity_arguments(p.oid) AS identity_args,
  pg_get_functiondef(p.oid) AS full_definition,
  CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security,
  COALESCE((SELECT unnest(proconfig) FROM pg_proc WHERE oid = p.oid AND proconfig IS NOT NULL AND unnest(proconfig) LIKE 'search_path=%'), 'NOT SET') AS search_path_setting
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'create_subscription_downgrade_payment';

-- G2. RPC grants
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND routine_name = 'create_subscription_downgrade_payment';

-- ============================================================================
-- H. MIGRATION 055 — TENANT CLASSIFICATION AUDIT
-- ============================================================================

-- H1. Table existence and columns
SELECT
  'tenant_classification_audit' AS table_name,
  CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tenant_classification_audit' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN 'EXISTS' ELSE 'MISSING' END AS status;

SELECT a.attname, pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
       CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable,
       pg_get_expr(ad.adbin, ad.adrelid) AS column_default
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_attrdef ad ON ad.adrelid = c.oid AND ad.adnum = a.attnum
WHERE n.nspname = 'public' AND c.relname = 'tenant_classification_audit'
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attnum;

-- H2. Foreign keys
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.tenant_classification_audit'::regclass
  AND contype = 'f';

-- H3. CHECK constraint on new_suspension_reason
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.tenant_classification_audit'::regclass
  AND contype = 'c';

-- H3. Indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'tenant_classification_audit';

-- H4. RLS and policies
SELECT c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'tenant_classification_audit';

SELECT polname, polcmd,
       array(SELECT rolname FROM pg_roles r WHERE r.oid = ANY(polroles)) AS roles,
       pg_get_expr(polqual, polrelid) AS using_expr
FROM pg_policy
JOIN pg_class c ON c.oid = polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'tenant_classification_audit';

-- H5. Grants
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' AND table_name = 'tenant_classification_audit';

-- ============================================================================
-- I. MIGRATION 056 — CLASSIFICATION RPC
-- ============================================================================

-- I1. Function definition
SELECT
  p.proname, pg_get_function_identity_arguments(p.oid) AS identity_args,
  pg_get_functiondef(p.oid) AS full_definition,
  CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security,
  COALESCE((SELECT unnest(proconfig) FROM pg_proc WHERE oid = p.oid AND proconfig IS NOT NULL AND unnest(proconfig) LIKE 'search_path=%'), 'NOT SET') AS search_path_setting
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'classify_tenant_suspension_expiry';

-- I2. RPC grants
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND routine_name = 'classify_tenant_suspension_expiry';

-- ============================================================================
-- J. FOREIGN KEYS AND LOCK PREREQUISITES
-- ============================================================================

-- J1. subscriptions.tenant_id -> tenants.id
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition,
  confdeltype = 'r' AS on_delete_restrict,
  confupdtype = 'r' AS on_update_restrict
FROM pg_constraint
WHERE conrelid = 'public.subscriptions'::regclass
  AND confrelid = 'public.tenants'::regclass
  AND contype = 'f';

-- J2. Lock mode terminology reference (documentation only)
SELECT 'Row-level FOR UPDATE acquires RowExclusiveLock on tuple' AS lock_note
UNION ALL
SELECT 'Foreign key insert requires KEY SHARE lock on referenced tuple' AS lock_note
UNION ALL
SELECT 'RowExclusiveLock conflicts with KEY SHARE lock (prevents concurrent FK insert)' AS lock_note;

-- ============================================================================
-- K. RELEVANT CONSTRAINTS AND INDEXES
-- ============================================================================

-- K1. Payment idempotency (idempotency_key unique per purpose?)
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'payments' AND indexname LIKE '%idempotency%';

-- K2. Renewal period unique index (migration 046)
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'payments' AND indexname = 'idx_payments_subscription_renewal_period_unique';

-- K3. Subscription FK to plans
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.subscriptions'::regclass
  AND contype = 'f' AND confrelid = 'public.plans'::regclass;

-- K4. Scheduled plan FK to plans
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.subscriptions'::regclass
  AND contype = 'f' AND confrelid = 'public.plans'::regclass
  AND conname LIKE '%scheduled%';

-- K5. Payment FK to subscriptions
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.payments'::regclass
  AND contype = 'f' AND confrelid = 'public.subscriptions'::regclass;

-- ============================================================================
-- L. CURRENT PRODUCTION DATA SAFETY
-- ============================================================================

-- L1. Plan prices and status
SELECT name, price_monthly, is_active,
  CASE
    WHEN lower(name) = 'starter' AND price_monthly = 299 AND is_active THEN 'OK'
    WHEN lower(name) = 'growth' AND price_monthly = 699 AND is_active THEN 'OK'
    WHEN lower(name) = 'business' AND price_monthly = 1299 AND is_active THEN 'OK'
    WHEN lower(name) IN ('free','scale','pro') AND NOT is_active THEN 'OK (deactivated)'
    ELSE 'UNEXPECTED'
  END AS validation
FROM public.plans ORDER BY price_monthly;

-- L2. Subscription status counts
SELECT status, COUNT(*) AS count
FROM public.subscriptions
GROUP BY status ORDER BY count DESC;

-- L3. Subscriptions with scheduled plan changes
SELECT
  s.id, s.tenant_id, s.plan_id AS current_plan, s.scheduled_plan_id AS target_plan,
  s.scheduled_plan_change_at, s.status, s.downgrade_request_id
FROM public.subscriptions s
WHERE s.scheduled_plan_id IS NOT NULL
ORDER BY s.scheduled_plan_change_at;

-- L4. Scheduled downgrades missing request IDs
SELECT
  s.id, s.tenant_id, s.plan_id AS current_plan, s.scheduled_plan_id AS target_plan,
  s.scheduled_plan_change_at, s.status, s.downgrade_request_id
FROM public.subscriptions s
WHERE s.scheduled_plan_id IS NOT NULL
  AND s.status = 'active'
  AND s.downgrade_request_id IS NULL;

-- L5. Payments by purpose and status
SELECT purpose, status, COUNT(*) AS count
FROM public.payments
GROUP BY purpose, status ORDER BY purpose, status;

-- L6. Downgrade payments missing correlation metadata
SELECT
  p.id, p.subscription_id, p.target_plan_id, p.status,
  p.metadata->>'downgrade_request_id' AS metadata_request_id,
  s.downgrade_request_id AS subscription_request_id
FROM public.payments p
JOIN public.subscriptions s ON s.id = p.subscription_id
WHERE p.purpose = 'subscription_downgrade'
  AND (p.metadata->>'downgrade_request_id' IS NULL
       OR s.downgrade_request_id IS NULL
       OR p.metadata->>'downgrade_request_id' <> s.downgrade_request_id::text);

-- L7. Inactive tenants by suspension_reason
SELECT
  t.is_active, t.suspension_reason,
  COUNT(*) AS tenant_count
FROM public.tenants t
GROUP BY t.is_active, t.suspension_reason
ORDER BY t.is_active, t.suspension_reason;

-- L8. Inactive tenants with NULL suspension_reason (requires manual reconciliation)
SELECT
  t.id, t.name, t.slug, t.suspension_reason,
  s.id AS subscription_id, s.status AS subscription_status,
  s.current_period_end, s.grace_period_end,
  p.name AS plan_name, p.price_monthly
FROM public.tenants t
LEFT JOIN public.subscriptions s ON s.tenant_id = t.id
LEFT JOIN public.plans p ON p.id = s.plan_id
WHERE t.is_active = false
  AND t.suspension_reason IS NULL
ORDER BY t.name;

-- ============================================================================
-- END OF DIAGNOSTIC
-- ============================================================================