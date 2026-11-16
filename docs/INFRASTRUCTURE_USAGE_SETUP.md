# Infrastructure Usage Monitoring - Setup & Operations

This document describes how to enable and operate the Storefy Infrastructure Usage system (storage accounting/reconciliation, database monitoring, capacity/alerts, Super Admin dashboard). It is written to be safe for production rollout: **migrations are created in-repo but must be reviewed and applied manually**.

## 1) Database migration (required, NOT auto-applied)

- **Migration file:** `supabase/migrations/060_infrastructure_usage_monitoring.sql`
- **Status:** created in source only. **Do NOT execute automatically.** Apply via Supabase SQL Editor or your controlled migration process after review.
- **What it adds:** `tenant_storage_usage`, `storage_upload_reservations`, `storage_reconciliation_runs`, `storage_reconciliation_discrepancies`, `infrastructure_usage_snapshots`, `infrastructure_capacity_config`, `infrastructure_alert_state`, supporting indexes/constraints/triggers, RLS policies, and SECURITY DEFINER RPCs for atomic reservations/finalization/adjustment/reconciliation run tracking.
- **Pre-reqs:** existing tables/buckets/RLS from prior migrations (especially `016_product_images_and_storage.sql`, `026_create_store_assets.sql`, `039_update_plans_finalized.sql`, `057_product_limit_enforcement_and_plan_sync.sql`). No existing migrations are modified.
- **Rollback/safety:** additive schema only (no destructive data changes). If rollback is needed, disable scheduler/routes first; dropping objects requires careful dependency review. Back up before applying in production.

## 2) Storage accounting & reconciliation behavior

- **Internal (fast):** uploads reserve quota atomically via `reserve_storage_quota` (prevents race over-allocation, idempotent by reservation key), finalize on success, release on failure. Deletes adjust counters after confirmed storage/object removal paths.
- **Actual (reconciled):** `runStorageReconciliation()` scans `storage.objects` for `product-images` and `store-assets` (paths `tenant/{tenantId}/...`), compares against `product_images`/`store_assets` records and counters, records discrepancies/orphans/missing objects, and writes snapshots.
- **Safe failure:** if storage measurement/accounting is unknown/unavailable, code must not treat unknown as zero; quota checks fail safely on measurement errors and UI shows unavailable/stale states.
- **Idempotency/concurrency:** reservation keys, advisory/run guards in RPCs, and unique snapshot keys prevent duplicate/corrupt counters on retries or concurrent runs.

## 3) Scheduler (required for automatic daily reconciliation)

- **Confirmed schedule:** daily **06:00 Asia/Dhaka = 00:00 UTC**.
- **Protected endpoint:** `POST /api/platform/infrastructure/reconcile-scheduled`
  - Auth: `Authorization: Bearer <INFRA_RECONCILIATION_SECRET>` (server-side secret only; not for tenant/browser use).
  - Runs storage reconciliation (`trigger_source: scheduled`) and records a database size snapshot (best-effort).
  - Optional body: `{ "scheduledFor": "YYYY-MM-DD" }` (Dhaka schedule date) for idempotent daily runs.
- **Environment variable:** set `INFRA_RECONCILIATION_SECRET` in the hosting environment (Vercel/Supabase edge/cron runner) to a strong random secret. Without it, the endpoint rejects all calls.
- **Scheduling options (choose one, external configuration):**
  - **Supabase pg_cron / SQL scheduler:** schedule an HTTP call to the deployed endpoint at `0 0 * * *` UTC with the bearer secret (store secret securely; do not hardcode in migrations).
  - **Supabase Edge Function + cron trigger:** invoke the endpoint on schedule.
  - **Hosting/platform cron (e.g. Vercel Cron):** `0 0 * * *` hitting the endpoint with `Authorization: Bearer $INFRA_RECONCILIATION_SECRET`.
- **Important:** until a scheduler is configured and migrations applied, automatic reconciliation/snapshots are **not active**. Super Admins can trigger manual runs from `/platform/infrastructure-usage` (requires super-admin session).

## 4) Capacity configuration (manual, authoritative only)

- **Never fabricated:** storage/database capacity and percentages remain `Unavailable` until configured from an authoritative source.
- **Configure via Super Admin API/UI:** `POST /api/platform/infrastructure/capacity`
  - `metricType`: `storage` | `database`
  - `capacityBytes`: positive integer or `null` to clear
  - `sourceType`: `manual` | `supabase_dashboard` | `supabase_api` | `unconfigured`
  - `sourceLabel`, `notes`, `verified` (manual entries are stored as unverified by design)
- **Supabase API auto-detect:** not implemented as an authoritative automatic source in-app unless a verified project-capacity API is available; treat dashboard/API values as manual/source-tracked inputs. Document the source and date when entering values.
- **Thresholds:** 70% Warning, 85% High, 95% Critical. Alerts apply only when capacity is configured; tenant plan quota alerts are distinct from infrastructure capacity alerts.

## 5) Database monitoring notes

- **`pg_database_size(current_database())`** reports Postgres database size (tables/indexes), **not** Supabase Storage bucket/object bytes.
- **Access:** direct execution may be unavailable to the app role; optional RPC helpers `get_database_size_bytes` / `get_largest_tables` can be added with least-privilege, safe `search_path`, and explicit grants if you want exact/largest-table metrics in-app. If inaccessible, UI/API must show `UNAVAILABLE` (no guessing).
- **Classification:** metrics are labeled EXACT/DERIVED/ESTIMATED/UNAVAILABLE based on source.

## 6) Super Admin dashboard & APIs

- **Page:** `/platform/infrastructure-usage` (super-admin only, under existing `/platform` layout/sidebar).
- **APIs (all super-admin guarded unless noted):**
  - `GET /api/platform/infrastructure/overview`
  - `GET /api/platform/infrastructure/storage`
  - `GET /api/platform/infrastructure/database`
  - `GET /api/platform/infrastructure/tenants`
  - `GET /api/platform/infrastructure/history?days=30&metric=...`
  - `GET|POST /api/platform/infrastructure/reconciliation` (manual run via POST)
  - `GET /api/platform/infrastructure/alerts`
  - `GET|POST /api/platform/infrastructure/capacity`
  - `POST /api/platform/infrastructure/reconcile-scheduled` (secret-auth scheduler endpoint)

## 7) Validation checklist (post-apply)

1. Apply migration 060 in a controlled environment; verify tables/RPCs/RLS/grants.
2. Run manual reconciliation from dashboard/API; confirm `storage_reconciliation_runs` row and tenant `actual_usage_bytes` updates.
3. Upload/delete product images and store assets; verify reservations finalize/release and counters adjust (no silent-zero on failures).
4. Confirm over-quota uploads are rejected with clear errors; unknown measurement paths fail safely.
5. Set capacity config (if authoritative value known) and confirm thresholds/remaining/% display; leave unset to confirm UNAVAILABLE behavior.
6. Configure and test scheduled endpoint with `INFRA_RECONCILIATION_SECRET` at 00:00 UTC; verify idempotent daily behavior.
7. Run `pnpm lint` and `pnpm build` and address any regressions.
