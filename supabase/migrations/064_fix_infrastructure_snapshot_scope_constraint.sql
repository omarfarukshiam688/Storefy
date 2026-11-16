-- Migration 064: Fix incomplete CHECK constraint on infrastructure_usage_snapshots
-- Source only; NOT executed against live database.
--
-- Problem: Migration 060 applied a DO block that checks only constraint name
-- (conname) in pg_constraint. A pre-existing constraint named
-- infrastructure_usage_snapshots_scope_check with an incomplete definition
-- CHECK (scope = ANY (ARRAY['global', 'tenant', 'table']))
-- was found and skipped, leaving the table without the intended
-- scope/referential integrity constraint.
--
-- This migration:
--   1. Validates that no existing rows violate the expected constraint.
--      NULL-safe: explicit scope IS NULL check + scope IS NOT NULL in the AND
--      chain ensures the expression always evaluates to TRUE or FALSE,
--      never NULL, so WHERE correctly captures all violations.
--   2. Drops the existing constraint (regardless of definition).
--   3. Recreates it with the exact expected definition including
--      scope IS NOT NULL.
--   4. Is fully transactional and idempotent.

DO $$
DECLARE
    v_constraint_exists boolean;
    v_violation_count integer;
BEGIN
    -- Step 1: Check whether the named constraint already exists
    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'infrastructure_usage_snapshots_scope_check'
          AND conrelid = 'public.infrastructure_usage_snapshots'::regclass
    ) INTO v_constraint_exists;

    -- Step 2: Validate existing data against the expected constraint BEFORE
    -- dropping anything. NULL-safe logic:
    --   - scope IS NULL is checked explicitly (catches NULL scope rows)
    --   - scope IS NOT NULL is part of the AND chain, so the expression
    --     always evaluates to TRUE or FALSE (never NULL), ensuring
    --     WHERE NOT (...) correctly captures all violations.
    SELECT COUNT(*) INTO v_violation_count
    FROM public.infrastructure_usage_snapshots
    WHERE scope IS NULL
       OR NOT (
           scope IS NOT NULL AND (
               (scope = 'tenant'  AND tenant_id IS NOT NULL) OR
               (scope = 'global'  AND tenant_id IS NULL)      OR
               (scope = 'table'   AND object_name IS NOT NULL)
           )
       );

    IF v_violation_count > 0 THEN
        RAISE EXCEPTION
            'Cannot apply migration 064: % row(s) in public.infrastructure_usage_snapshots '
            'violate the expected scope/referential constraint. Review and clean the data '
            'before re-applying this migration.', v_violation_count;
    END IF;

    -- Step 3: Drop the existing constraint if present (regardless of its definition)
    IF v_constraint_exists THEN
        EXECUTE 'ALTER TABLE public.infrastructure_usage_snapshots '
                || 'DROP CONSTRAINT infrastructure_usage_snapshots_scope_check';
    END IF;

    -- Step 4: Add the constraint with the exact expected definition.
    -- scope IS NOT NULL is included so NULL scope values are rejected.
    -- The OR chain enforces per-scope column requirements.
    ALTER TABLE public.infrastructure_usage_snapshots
    ADD CONSTRAINT infrastructure_usage_snapshots_scope_check
    CHECK (
        scope IS NOT NULL AND (
            (scope = 'tenant'  AND tenant_id IS NOT NULL) OR
            (scope = 'global'  AND tenant_id IS NULL)      OR
            (scope = 'table'   AND object_name IS NOT NULL)
        )
    );
END $$;

-- End of migration 064 (source only, not applied)
