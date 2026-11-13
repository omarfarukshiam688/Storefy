# Storefy Production Database Migration Change-Control Workflow

**Document status:** Draft — change-control procedure only. No implementation performed by this document.  
**Applies to:** Single production Supabase project (Storefy).  
**Authoritative deployment method:** Supabase Dashboard → SQL Editor (manual, human-operated).  
**Source-controlled record:** Git-tracked migration files under `supabase/migrations/`.  
**Related prior findings:** Remote `supabase_migrations.schema_migrations` table was not found in a previous read-only inspection; recent payment migrations (046/047/048 intent) were independently verified as applied to the remote database; working tree contains modified `046` and untracked `047`/`048`.

---

## 1. Authoritative Deployment Method

1. **Supabase Dashboard SQL Editor is the only authorized production execution path.**
   - Database changes to production are applied manually by a human operator through the Supabase Dashboard SQL Editor.
   - Copy/paste the migration SQL into the SQL Editor, review it, then execute.

2. **Git migration files are the source-controlled record of intended database changes.**
   - Every migration file under `supabase/migrations/` represents a proposed or historical database change.
   - The presence of a migration file in Git does **not** mean it has been applied to production.

3. **Never assume a local migration file has been applied remotely.**
   - Before executing any migration, confirm whether its objects already exist in production by inspecting the remote schema (read-only, via Supabase Dashboard or a read-only replica if available).
   - Do not infer application status from Git history, commit messages, or file presence alone.

4. **No production SQL execution by automated agents.**
   - All production SQL must be executed manually by an authorized human operator. Automated agents (including this assistant) must not generate, execute, or transmit production SQL.

5. **No CLI deployment against production in this workflow.**
   - Do not run `supabase db push`, `supabase migration repair`, `supabase db pull`, or `supabase db reset` against production as part of this workflow. Future CLI adoption is a separate migration project (see Section 7).

---

## 2. Mandatory Migration Lifecycle

Each migration must pass through the following stages in order before it is considered deployed:

| Stage | Purpose | Gate criteria |
|---|---|---|
| **1. Draft** | Author the migration SQL and record intent. | File exists under `supabase/migrations/`; naming convention followed; purpose documented in file header. |
| **2. Technical review** | Peer review the SQL for correctness, naming, and compatibility. | Reviewer signs off; review recorded (e.g., PR comment or review log). |
| **3. Dependency and permission review** | Confirm dependencies exist (tables, functions, extensions, roles) and required GRANTs/RLS are included. | Dependencies verified against current production schema; permissions match intended access model. |
| **4. SQL review** | Final review of the exact SQL to be executed. | SQL reviewed against the version that will be pasted into the SQL Editor; no drift between reviewed file and executed SQL. |
| **5. Manual production execution** | Execute the SQL in Supabase Dashboard SQL Editor. | Authorized human operator runs the SQL; execution result captured. |
| **6. Post-deployment verification** | Confirm expected objects exist and behave correctly. | Verification queries executed (read-only) and results recorded; columns, constraints, indexes, functions, grants, and RLS checked where relevant. |
| **7. Deployment record** | Create an immutable deployment record. | Record written in the format defined in Section 3. |
| **8. Git commit** | Commit the migration file (and deployment record if stored in repo) to Git. | Commit references the deployment record; commit message follows repo convention. |

No stage may be skipped. A migration is not considered deployed until Stage 7 and Stage 8 are complete.

---

## 3. Deployment Record Format

A deployment record MUST be created for every production migration. Suggested format (markdown or plain text):

```
Deployment Record
=================
Migration filename:     supabase/migrations/NNNN_description.sql
Git commit / hash:      <commit-hash> (or "uncommitted" if not yet committed)
Deployment date/time:   <ISO-8601 UTC>
Operator:               <name / role>
Production project:     Storefy (single production project)  -- never credentials
Execution result:       Success / Partial failure / Failure
SQL executed:           <verbatim SQL or reference to migration file>
Verification queries:   <list of read-only queries run>
Verification results:   <verbatim results per query>
Objects verified:       columns, constraints, indexes, functions, grants, RLS (as applicable)
Deviations:             <any difference between reviewed SQL and executed SQL>
Recovery actions:       <any forward-fix or rollback action taken>
Rollback feasible:      Yes / No (with explanation)
Signed off by:          <operator>
```

**Rules:**
- Never record database credentials, connection strings, passwords, or access tokens in a deployment record.
- The production project identifier may be recorded (e.g., "Storefy production") but never secrets.
- Deployment records should be retained in a durable, audit-accessible location (e.g., a dedicated `docs/deployments/` directory or an external change-log system).

---

## 4. Safety Requirements

1. **No destructive SQL without explicit approval.**
   - `DROP`, `TRUNCATE`, `DELETE` without `WHERE`, data-altering `UPDATE`, or column removals require explicit, documented approval before execution.

2. **No blind re-execution of non-idempotent migrations.**
   - Many Storefy migrations (e.g., seed inserts, plan updates, backfills) are not idempotent. Do not re-run a migration unless its objects are confirmed absent or its SQL is proven idempotent (`IF NOT EXISTS`, `CREATE OR REPLACE`, guarded `DO $$`).

3. **No automated production SQL execution.**
   - Automated agents must not generate or execute production SQL. All production execution is manual.

4. **Do not assume SQL Editor success proves every expected object exists.**
   - A "success" response from the SQL Editor means the statement batch completed without error; it does not guarantee every column, index, constraint, function, grant, or policy was created as intended.

5. **Verify objects where relevant.**
   - After execution, run read-only verification queries against the expected objects:
     - Columns: `information_schema.columns`
     - Constraints: `information_schema.table_constraints`, `pg_constraint`
     - Indexes: `pg_indexes`
     - Functions: `pg_proc`, `information_schema.routines`
     - Grants: `information_schema.role_table_grants`, `information_schema.role_routine_grants`
     - RLS: `pg_policies`, `pg_class.relrowsecurity`

6. **Document rollback limitations and forward-fix strategy.**
   - Record whether rollback is feasible. Storefy migrations generally lack explicit `DOWN` scripts; prefer forward-fix (a correcting migration) over rollback where data loss risk exists.

---

## 5. Current Payment Migration Situation

The following payment-related migration state must be reconciled before any further payment deployment:

| Item | State | Notes |
|---|---|---|
| `supabase/migrations/046_fix_subscription_business_logic.sql` | Modified in working tree (tracked) | Differs from committed `HEAD` version. Working-tree version adds trusted payment columns/checks/index and rewrites `approve_or_reject_payment`. Remote database reportedly contains objects matching the working-tree intent, but this has not been re-verified in this session. |
| `supabase/migrations/047_clear_scheduled_plan_on_payment_rejection.sql` | Untracked | Contains `approve_or_reject_payment` replacement with rejection-time scheduled-plan cleanup. Depends on trusted payment columns from the working-tree `046`. |
| `supabase/migrations/048_atomic_upgrade_payment_creation.sql` | Untracked | Creates `create_subscription_upgrade_payment` RPC. Depends on trusted payment columns and idempotency uniqueness. |

**Why local and remote state must be reconciled before deployment:**

- The remote database already contains payment schema objects (columns, indexes, constraints, functions, grants) matching the 046/047/048 intent, but there is **no `supabase_migrations.schema_migrations` table** to record which migrations were applied.
- Git cannot tell us whether working-tree `046`, untracked `047`, or untracked `048` were applied, partially applied, or not applied at all.
- Executing any of these migrations again risks duplicate DDL (non-idempotent statements) or primary-key violations if a future history table is introduced.
- Before deploying any new payment migration, a human operator must inspect the remote schema (read-only) to confirm exactly which objects exist, then reconcile the local file set with that reality. Do not assume local files match remote state.

---

## 6. What This Workflow Does NOT Cover

- **CLI-based deployment.** `supabase db push`, `supabase migration repair`, `supabase db pull`, and `supabase db reset` are explicitly out of scope for this workflow and must not be run against production.
- **Automated deployment.** No CI/CD pipeline or automated agent is authorized to execute production SQL.
- **Migration-history repair.** Because no `schema_migrations` table exists, no repair commands should be run until the remote/local discrepancy is fully understood.

---

## 7. Future CLI Adoption (Separate Migration Project)

Adopting the Supabase CLI for migration tracking is a separate, future project. Prerequisites before any CLI-based production deployment:

1. Install the Supabase CLI in a controlled environment (currently not installed in this workspace).
2. Provision or confirm access to an isolated, non-production Supabase/PostgreSQL environment for testing.
3. Resolve duplicate migration version prefixes (`023` x2, `026` x2) and missing sequence numbers (`041`, `044`) in Git, because `schema_migrations.version` is a primary key and duplicates cannot both be recorded as applied.
4. Establish a baseline migration representing the verified production schema (e.g., via `supabase db pull --remote` against a non-production/mirrored project), recorded as applied, then adopt a clean forward-only sequence.
5. Validate the full migration chain on an isolated disposable database before any production use.
6. Update this document to add the CLI workflow as the authoritative method, with change control.

**Do not run `supabase db push`, `supabase migration repair`, `supabase db pull`, `supabase db reset`, or `supabase migration up` against production as part of this task.**

---

## 8. Summary of Change-Control Principles

| Principle | Requirement |
|---|---|
| Authoritative path | Supabase Dashboard SQL Editor, manual human execution |
| Source of truth | Git-tracked migration files under `supabase/migrations/` |
| Application assumption | Never assume local file applied remotely |
| Execution authorization | Human operator only; no automated agents |
| Destructive SQL | Explicit approval required |
| Re-execution | Never blindly re-run non-idempotent migrations |
| Verification | Read-only verification of columns, constraints, indexes, functions, grants, RLS |
| Record-keeping | Deployment record per Section 3, then Git commit |
| Rollback | Document rollback limitations; prefer forward-fix |
| Payment migrations | Reconcile local `046`/`047`/`048` with remote before deployment |
| CLI adoption | Separate project; no CLI commands against production now |

---

**End of document.** No Storefy source files, SQL migrations, or Git state were modified by this document. This is a procedure document only; it does not verify any deployment.