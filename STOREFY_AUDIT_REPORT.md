# Storefy Project Status Audit Report

**Project:** Storefy — Multi-tenant SaaS e-commerce platform  
**Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui + Radix, Supabase (Auth/Storage/PostgreSQL + RLS), pnpm  
**Audit Type:** Evidence-based architectural / security / production-readiness audit  
**Scope:** Read-only inspection (no code, migrations, env vars, or dependency changes)  
**Date:** 2026-11-07  
**Working Dir:** `C:\Users\Lenovo\Documents\Project\Storefy`

---

## Executive Summary

Storefy is a fully built-out, multi-tenant e-commerce SaaS with a complete feature surface: tenant onboarding, product catalog (with images), cart, checkout, orders, customers, reviews, team/invitations, analytics, announcements, notifications (email/in-app/telegram), rate limiting, storage-based resource usage, and platform super-admin controls. The codebase is clean, well-structured, uses zod validation throughout, separates Supabase server/client/admin clients, and applies RLS consistently.

However, **production readiness is currently blocked by confirmed defects** that must be fixed before launch:

1. **Notifications DELETE permission mismatch (CONFIRMED BUG):** Migration `034_create_notifications.sql` grants only `select, update` on `public.notifications` to `authenticated`, but `app/api/notifications/[id]/route.ts` performs DELETE. Any delete request from an authenticated user will fail RLS (403/500).
2. **No global middleware:** No `middleware.ts` exists. Route protection is implemented per-page/API only. Unauthenticated users can reach protected routes before client-side checks fire.
3. **Email-confirmation lockout risk:** `config.toml` sets `enable_confirmations = false`, but `app/dashboard/layout.tsx` redirects to `/verify-email` when `email_confirmed_at` is null — users can be permanently locked out of the dashboard.
4. **No payment gateway integration:** `payment_method`/`payment_status` fields exist and are hardcoded to `'pending'` at checkout. **SSLCommerz (or any gateway) is NOT integrated** — no real payment capture, webhook, or success/failure handling exists.

Estimated effort to production readiness: **2–4 weeks** depending on payment gateway scope.

---

## Answers to Audit Questions

### Q1. Does the app have a functional dashboard for tenants and super admins?

**PARTIAL / COMPLETE (UI), PARTIAL (backend guards).**

- Tenant dashboard: `app/dashboard/page.tsx` + `lib/dashboard/index.ts` (`getDashboardStats`) — overview stats, recent orders, low-stock alerts. Tenant-specific pages exist: products, orders, customers, reviews, analytics, settings, announcements, notifications, team, storefront, upgrade, onboarding.
- Super-admin dashboard: `app/platform/overview/page.tsx` + `lib/platform/index.ts` — platform-wide stats (tenants, users, revenue, orders), tenant list, plans, users, settings, announcements.
- Role enforcement: `lib/auth/tenant.ts` (`requireTenantAdmin`, `getTenantContext`), `config/roles.ts` (hierarchy: super_admin 100, tenant_admin 50, tenant_staff 10). Dashboard layout redirects unauthenticated users to `/login`.
- **Gap:** No global middleware — protection is per-page/API only. Unauthenticated requests reach protected routes before client checks fire.

### Q2. Is there multi-tenant data isolation via RLS, and is it enforced consistently?

**COMPLETE for schema/RLS; PARTIAL for enforcement consistency.**

- All 17 core tables have RLS policies (migrations `007`–`031`). Policies keyed on `tenant_id` / `auth.uid()` / `tenant_members` membership. `authenticated` role granted `select, insert, update, delete` per table via migration grants.
- `lib/auth/tenant.ts` `getTenantContext()` resolves tenant + role from `tenant_members` + `profiles`. `requireTenantAdmin()` / `requireTenantMember()` enforce on API routes.
- **Gap:** Notification DELETE grant missing (see Critical Bugs). Some page components rely on client-side role checks without server re-validation in every path.

### Q3. Are authentication flows (login, signup, password reset) complete and secure?

**COMPLETE (UI + validation); NOT VERIFIED (email provider wiring).**

- `app/auth/login/page.tsx`, `lib/auth/session.ts` (`getAuthUser`), zod schemas in `lib/validation/auth.ts` (signIn 8+ char password, signUp, forgot/reset with match refine).
- Supabase Auth used; `config.toml` `enable_confirmations = false`.
- **Gap:** No `middleware.ts` for session enforcement. Forgot/reset pages were not fully read — email provider (Resend) wiring for reset emails not confirmed. `sendNotification` exists but email-send path for auth resets not traced.

### Q4. Is the checkout + order flow complete end-to-end?

**PARTIAL — order creation COMPLETE; payment processing MISSING.**

- `app/api/checkout/route.ts`: rate-limited (5/hr per IP), validates cart items against products (active, not archived, not out of stock), enforces plan `order_limit`, creates `orders` + `order_items`, upserts `customers`, sends order-created email + in-app notification.
- `payment_method: 'pending'`, `payment_status: 'pending'` hardcoded — **no payment gateway integration**. No SSLCommerz/Stripe/Razorpay found (grep returned zero matches for `sslcommerz|stripe|razorpay|bkash|nagad`). No webhook handler, no payment success/failure pages, no transaction table.
- Cart is localStorage-only (`lib/cart/cart-context.tsx`) — not persisted server-side; lost on device/browser change.

### Q5. Are notifications (in-app, email, telegram) implemented and working?

**PARTIAL — in-app COMPLETE; email PARTIAL; telegram COMPLETE (best-effort); DELETE BROKEN.**

- In-app: `lib/notifications/in-app.ts` (`createNotification`, `createNotificationsForTenantMembers`), `notification_logs` table, `app/api/notifications/route.ts` (list), `app/api/notifications/[id]/route.ts` (mark-read + DELETE).
- Email: `lib/notifications/service.ts` (`sendNotification`), Resend provider `lib/notifications/providers/resend.ts`, templates in `lib/notifications/templates/`. Order-created email sent from checkout.
- Telegram: `lib/notifications/telegram/service.ts` + `provider.ts`, platform events (user.signup, tenant.created, payment.received), best-effort (`.catch(() => {})`), graceful degradation when `TELEGRAM_BOT_TOKEN`/`CHAT_ID` unset.
- **CONFIRMED BUG:** Migration `034_create_notifications.sql` grants only `select, update` to `authenticated` on `public.notifications` — DELETE in `[id]/route.ts` will fail RLS.

### Q6. Is SSLCommerz (or any payment gateway) integrated?

**MISSING — not integrated.**

- Zero matches for `sslcommerz|stripe|razorpay|bkash|nagad` across the codebase.
- Checkout hardcodes `payment_method: 'pending'` and `payment_status: 'pending'`. No webhook endpoint, no payment callback, no transaction/refund table, no gateway config in `.env.example` (only Supabase, Resend, Telegram vars).

### Q7. Are file/image uploads (products, store assets) handled securely with signed URLs?

**COMPLETE.**

- `lib/storage/index.ts`: `getProductImageSignedUrl`, `getStoreAssetSignedUrl` (Supabase Storage signed URLs, 3600s expiry, optional image transform). `lib/storefront/images.ts` enriches product images with signed URLs; handles `http://`/`https://` passthrough.
- `app/api/products/[id]/images/route.ts`, `reorder`, upload with zod validation (`lib/validation/product-image.ts`).
- Storage buckets not inspected — bucket RLS / public access not verified.

### Q8. Is rate limiting implemented and does it protect checkout/auth?

**COMPLETE.**

- `lib/rate-limit/index.ts`: `checkRateLimit` / `recordRateLimit` using Supabase `rate_limit_log` table, sliding-window by key + action + tenant. Checkout: 5 requests/hr per IP (`app/api/checkout/route.ts:12`). Rate-limit RLS in `031_rate_limit_log_rls.sql`.

### Q9. Are there admin tools for tenant management, plans, and platform oversight?

**COMPLETE.**

- Platform: `app/platform/{tenants,plans,users,settings,announcements,overview}`. `lib/platform/index.ts` (`getPlatformOverview`, `getPlatformTenants`, `getPlatformPlans`, `getPlatformUsers`, `getPlatformSettings`, `getPlatformAnnouncements`).
- Tenant management: `lib/tenants/index.ts` (`createTenantForUser`, `updateTenantSettings`, `isSlugAvailable`), API `app/api/tenants/create`, `check-slug`, `[tenantId]/settings`.
- Plans: `lib/plans/index.ts` + `usage.ts` (`getTenantResourceUsage` via Supabase Storage `info()`), `app/api/platform/plans`.
- Role hierarchy: `config/roles.ts` (super_admin 100, tenant_admin 50, tenant_staff 10).

### Q10. Is the codebase ready for production deployment?

**NOT READY — BLOCKED.**

- Build/typecheck not run (read-only audit). No `middleware.ts` (auth/session redirects are handled by root `proxy.ts`). Notifications DELETE broken. Email-confirmation lockout risk. No payment gateway. `.env.example` exists but no `.env` verified. No tests directory found.

---

## Feature Completion Matrix

| Feature | Status | Evidence / Notes |
|---|---|---|
| Multi-tenant architecture | COMPLETE | 17 tables RLS-isolated by `tenant_id`; `getTenantContext()` |
| Tenant onboarding (create + slug check) | COMPLETE | `app/api/tenants/create`, `check-slug`; `lib/tenants` |
| Plans & usage limits | COMPLETE | `lib/plans`; `order_limit` enforced at checkout |
| Product catalog (CRUD + images) | COMPLETE | `app/api/products/*`; signed URLs via `lib/storage` |
| Cart | COMPLETE (client only) | `lib/cart/cart-context.tsx` — localStorage, not server-persisted |
| Checkout + orders | PARTIAL | Order creation complete; **no payment gateway** |
| Customers | COMPLETE | `lib/customers`; `app/api/customers` |
| Reviews | COMPLETE | `lib/reviews`; status pending/approved/rejected/hidden |
| Team / invitations | COMPLETE | `lib/team`; invitations + role updates |
| Notifications (in-app) | COMPLETE | `lib/notifications/in-app`; `notification_logs` |
| Notifications (email/Resend) | PARTIAL | Provider + templates exist; reset-email wiring NOT VERIFIED |
| Notifications (telegram) | COMPLETE (best-effort) | `lib/notifications/telegram`; platform events |
| Notifications DELETE | **BROKEN** | Missing DELETE grant (migration 034) |
| Rate limiting | COMPLETE | `lib/rate-limit`; checkout 5/hr/IP |
| Analytics | COMPLETE | `lib/analytics`; revenue by `payment_status='paid'` |
| Announcements | COMPLETE | `lib/announcements`; platform + tenant |
| Store assets (logo/favicon/hero) | COMPLETE | `lib/storefront/images`; signed URLs |
| Super-admin platform dashboard | COMPLETE | `app/platform/*`; `lib/platform` |
| Auth (login/signup/reset) | COMPLETE (UI) | `lib/auth/session`; zod schemas |
| Email confirmation | CONFIG CONFLICT | `enable_confirmations = false` but layout redirects to `/verify-email` |
| Payment gateway (SSLCommerz/other) | **MISSING** | Zero matches; `payment_status` hardcoded `'pending'` |
| Global middleware | **MISSING** | No `middleware.ts`; per-route protection only |
| Tests | MISSING | No `__tests__` / `*.test.*` directory found |

---

## Critical Bugs & Security Risks

### CB-1: Notifications DELETE permission mismatch (CONFIRMED, HIGH)
- **File:** `supabase/migrations/034_create_notifications.sql` grants only `select, update` on `public.notifications` to `authenticated`.
- **File:** `app/api/notifications/[id]/route.ts` performs DELETE.
- **Impact:** Authenticated users cannot delete notifications — returns 403/500. Breaks notification-center UX.
- **Fix:** Add `delete` to the grant, or add a restrictive RLS delete policy (owner-only).

### CB-2: No global middleware (HIGH)
- **Impact:** Protected dashboard/platform routes render before client-side auth checks; unauthenticated users can reach protected endpoints briefly; no centralized session enforcement.
- **Fix:** Add `middleware.ts` with `supabase.auth.getUser()` + redirect logic for `/dashboard`, `/platform`, `/s/[slug]/checkout`.

### CB-3: Email-confirmation lockout risk (MEDIUM)
- **File:** `supabase/config.toml: enable_confirmations = false`.
- **File:** `app/dashboard/layout.tsx` redirects to `/verify-email` when `!user.email_confirmed_at`.
- **Impact:** With confirmations disabled, `email_confirmed_at` is null for all users → permanent dashboard lockout.
- **Fix:** Either enable confirmations in config, or remove the `/verify-email` redirect guard.

### SR-1: No payment gateway (HIGH — business risk, not security)
- Checkout records orders with `payment_status: 'pending'` and never captures payment. No webhook, no transaction table, no refund flow. Cannot accept real payments.

### SR-2: `.env` not verified (MEDIUM)
- `.env.example` exists (Supabase, Resend, Telegram). Production `.env` contents not inspected — must confirm no secrets committed and all vars present.

### SR-3: Cart is localStorage-only (LOW)
- Cart not persisted server-side; lost across devices/browsers. Acceptable for MVP, not for production checkout reliability.

---

## Production Readiness Assessment

| Area | Status |
|---|---|
| Code structure / typing | READY |
| RLS + multi-tenant isolation | READY (modulo CB-1) |
| Auth UI + session | READY (modulo CB-2, CB-3) |
| Tenant onboarding + plans | READY |
| Catalog + images + signed URLs | READY |
| Cart | PARTIAL (client-only) |
| Checkout / orders | NOT READY (no payment gateway) |
| Notifications | NOT READY (CB-1 DELETE broken) |
| Rate limiting | READY |
| Analytics / announcements / team | READY |
| Global middleware | NOT READY (CB-2) |
| Tests / CI | NOT READY (none found) |
| Env / secrets | NOT VERIFIED |

**Verdict:** NOT production-ready. Blocked by CB-1, CB-2, CB-3, SR-1.

---

## Next 5 Priorities (in order)

1. **Fix notifications DELETE grant** — Add `delete` privilege / RLS delete policy in a new migration for `public.notifications` (owner-only).
2. **Add `middleware.ts`** — Centralized session enforcement for `/dashboard`, `/platform`, `/s/[slug]/checkout`; redirect unauthenticated to `/login`.
3. **Resolve email-confirmation lockout** — Align `config.toml` `enable_confirmations` with dashboard guard; remove `/verify-email` redirect if confirmations stay disabled.
4. **Integrate payment gateway** — Add SSLCommerz (or target gateway) webhook handler, payment success/failure pages, transaction table; stop hardcoding `payment_status: 'pending'`.
5. **Add tests + run typecheck/lint** — `pnpm typecheck`, `pnpm lint`, add unit/integration tests for checkout, RLS, notifications.

---

## Roadmap

| Phase | Focus | Est. Effort |
|---|---|---|
| P0 — Production unblock | CB-1, CB-2, CB-3, SR-2 (env verification) | 1–2 weeks |
| P1 — Payments | SSLCommerz integration + webhooks + success/failure | 2–3 weeks |
| P2 — Reliability | Server-persisted cart, tests, CI, monitoring | 2–3 weeks |
| P3 — Polish | Email confirmation flow, reset-email verification, docs refresh | 1 week |

---

## Decision Questions for the Team

1. **Payment gateway:** Confirm target gateway (SSLCommerz was asked about but is not present). Should we integrate SSLCommerz specifically, or another provider?
2. **Email confirmation:** Keep `enable_confirmations = false` and remove the `/verify-email` redirect, or enable confirmations and wire up Resend confirmation emails?
3. **Notifications DELETE:** Grant `delete` to `authenticated` (any authenticated user can delete any notification) or add owner-only RLS delete policy?
4. **Cart persistence:** Keep localStorage cart, or migrate to server-side cart tied to `customers`/`orders`?
5. **Tests:** Which test framework should be adopted (Vitest + React Testing Library, Playwright, etc.)?

---

## Evidence Index (key files inspected)

- `supabase/migrations/034_create_notifications.sql` — notifications schema + grants (missing DELETE)
- `supabase/migrations/007_tenant_rls.sql` … `031_rate_limit_log_rls.sql` — RLS policies + grants
- `supabase/config.toml` — `enable_confirmations = false`
- `app/api/notifications/[id]/route.ts` — DELETE endpoint (fails RLS)
- `app/dashboard/layout.tsx` — `/verify-email` redirect guard
- `app/api/checkout/route.ts` — checkout; `payment_method: 'pending'`, `payment_status: 'pending'`
- `lib/cart/cart-context.tsx` — localStorage cart
- `lib/auth/tenant.ts` — `getTenantContext`, `requireTenantAdmin`
- `lib/validation/*.ts` — zod schemas (auth, checkout, tenant, product-image, team, review, order, announcement)
- `lib/notifications/{service,in-app,telegram/providers/resend,templates}` — notification stack
- `lib/platform/index.ts` — super-admin platform API
- `lib/storage/index.ts`, `lib/storefront/images.ts` — signed URLs
- `lib/rate-limit/index.ts` — rate limiting
- `config/roles.ts` — role hierarchy
- `.env.example` — env vars (no secrets)
- `app/api/tenants/create`, `check-slug`, `[tenantId]/settings` — tenant management
