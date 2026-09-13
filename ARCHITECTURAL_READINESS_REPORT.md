# Storefy — Architectural Readiness Report

**Date:** 2026-09-13
**Prepared by:** Kilo (Lead Software Architect)
**Purpose:** Pre-initialization assessment for the Storefy multi-tenant SaaS MVP

---

## 1. CURRENT STATE OF STOREFY REPOSITORY

**Status:** Empty / Uninitialized

The `C:\Users\Lenovo\Documents\Project\Storefy` directory is completely empty. No source code, configuration files, dependencies, or scaffolding exist.

**Implication:** Storefy must be bootstrapped from scratch. There is no existing code to refactor or preserve within the Storefy project itself.

---

## 2. REFERENCE SYSTEM: AMAR SHOPNO

Location: `C:\Users\Lenovo\Documents\Project\homemade-food-website\`

### 2.1 Stack Alignment

| Layer | Reference System | Storefy Target | Match? |
|-------|-----------------|----------------|--------|
| Framework | Next.js 16.2.0 | Next.js | Yes |
| React | 19.2.4 | React | Yes |
| Language | TypeScript 5.7.3 | TypeScript | Yes |
| Styling | Tailwind CSS v4.2.0 + PostCSS 8.5 | Tailwind CSS | Yes |
| UI Library | shadcn/ui (new-york style) + Radix UI | shadcn/ui | Yes |
| Database | Supabase (PostgreSQL) | Supabase + PostgreSQL | Yes |
| Auth | Supabase Auth | Supabase Auth | Yes |
| Storage | Supabase Storage | Supabase Storage | Yes |
| Package Manager | pnpm (pnpm-lock.yaml present) | — | Compatible |

**Conclusion:** The reference system's stack is a near-perfect match for Storefy's target architecture. We can reuse tooling, patterns, and dependencies without introducing new infrastructure.

### 2.2 Reusable Architectural Patterns

| Pattern | Location in Reference | Reusability |
|---------|----------------------|-------------|
| Supabase client separation (browser, server, admin/service-role) | `lib/supabase/client.ts`, `server.ts`, `admin.ts` | High — adapt for tenant-aware clients |
| Server Actions with auth guards | `app/actions.ts`, `app/admin/products/actions.ts` | High — adapt for tenant membership checks |
| RLS-enabled PostgreSQL schema | `supabase/migrations/001_create_tables.sql` | Medium — must add `tenant_id` columns |
| Updated-at triggers | Same migration file | High — generic pattern |
| Storage utilities (public URL, path extraction, validation) | `lib/storage.ts` | High — adapt for tenant-scoped paths |
| Next.js middleware for route protection | `middleware.ts` | Medium — must add tenant resolution |
| shadcn/ui component library | `components/ui/*` | High — direct reuse |
| TypeScript path aliases (`@/*`) | `tsconfig.json` | High — direct reuse |

### 2.3 Patterns That Must NOT Be Blindly Copied

| Pattern | Why It Must Change |
|---------|-------------------|
| Single `profiles.role = 'admin'` authorization | Storefy needs tenant membership + role hierarchy (tenant_admin, tenant_staff, super_admin) |
| Hardcoded business name "Amar Shopno" / Bengali content in layout/metadata | Must become tenant-driven configuration |
| Single-tenant database schema (no `tenant_id`) | Must add tenant isolation to all business tables |
| Service-role client used pervasively | Must be scoped; service role should not bypass tenant boundaries |
| Auth middleware only checks `/admin` paths | Must resolve tenant and enforce tenant membership |
| Public-readable products/orders without tenant scoping | Orders must be tenant-scoped; public product reads are fine if tenant-isolated |

---

## 3. TARGET ARCHITECTURE READINESS

### 3.1 Stack Compatibility

All target-stack technologies are present in the reference system. No new dependencies are required for the MVP.

### 3.2 Multi-Tenancy Design Constraints

| Requirement | Current State | Gap |
|-------------|--------------|-----|
| Shared PostgreSQL with `tenant_id` isolation | Single-tenant schema | Must add `tenant_id` to products, orders, order_items, reviews, faqs, customers, product_images, rate_limit_log |
| RLS enforced at DB layer | RLS exists but admin-only | Must redesign RLS to enforce tenant boundaries, not just role checks |
| Tenant resolution from request | None | Must implement tenant resolution middleware/route logic |
| Tenant-specific storefront URLs | None | Must implement route structure (e.g., `/store/[tenant]` or subdomain) |
| Tenant branding (name, logo, colors) | Hardcoded in layout | Must extract to tenant config table + dynamic rendering |
| Tenant membership (user ↔ tenant ↔ role) | Single `profiles` table linked to auth.users | Must create `tenant_members`, `tenant_invitations` tables |
| Platform admin (super_admin) | No concept | Must add super_admin role separate from tenant roles |

### 3.3 Database Schema Gaps

The reference schema must be extended with:

```text
tenants
  id, name, slug, domain, logo_url, brand_color, description,
  contact_email, contact_phone, address,
  delivery_settings (jsonb), payment_methods (jsonb), locale, currency,
  is_active, created_at, updated_at

tenant_members
  id, tenant_id, user_id, role (tenant_admin | tenant_staff), permissions (jsonb),
  is_active, created_at, updated_at

tenant_invitations
  id, tenant_id, email, role, token, expires_at, accepted_at, created_at

customers
  id, tenant_id, name, phone, email, address, district, notes,
  created_at, updated_at

categories
  id, tenant_id, name, slug, description, display_order, is_active,
  created_at, updated_at

reviews
  id, tenant_id, product_id, customer_name, rating, review_text, status,
  created_at, updated_at

faqs
  id, tenant_id, question, answer, display_order, is_active,
  created_at, updated_at

rate_limit_log
  id, tenant_id, identifier, action, created_at
```

Existing tables that need `tenant_id`:
```text
products → add tenant_id, update slug uniqueness to (tenant_id, slug)
orders → add tenant_id
order_items → add tenant_id (or inherit via order)
product_images → add tenant_id
```

---

## 4. AUTHENTICATION & AUTHORIZATION GAP ANALYSIS

### 4.1 Current State

- Supabase Auth handles authentication
- `profiles.role` is a single text field checked for `'admin'`
- Middleware only redirects unauthenticated users from `/admin`
- Server actions manually check `profile.role === 'admin'` in every action

### 4.2 Required Changes

1. **Replace role-based checks with membership-based checks:**
   - User must have an active `tenant_members` record for the current tenant
   - Role is stored in `tenant_members.role`, not `profiles.role`
   - Super admin is a special case (no tenant membership required)

2. **Tenant resolution:**
   - From subdomain: `tenant.storefy.com` → resolve via `tenants.domain`
   - From path: `/store/[tenant]` → resolve via `tenants.slug`
   - From admin dashboard: tenant must be explicitly selected or derived from user's primary membership

3. **Authorization helper:**
   - Create a reusable `requireTenantMembership()` helper used by all tenant-scoped server actions
   - Returns `{ tenant, membership }` or throws/redirects

---

## 5. STORAGE ARCHITECTURE GAP

### 5.1 Current State

Single bucket `product-images` with paths like:
```
product-images/<uuid>.<ext>
```

### 5.2 Required Changes

Must namespace storage by tenant:
```
product-images/
  tenant-<tenant-id>/
    products/
      <product-id>/
        image-1.webp
        image-2.webp
```

Storage authorization must verify the requesting user's tenant membership before allowing upload/delete operations.

---

## 6. RISKS AND BLOCKERS

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Reference project uses `typescript: { ignoreBuildErrors: true }` | Medium | Storefy must enforce strict TypeScript from day one |
| Reference project has no lint script configured | Low | Add ESLint with strict rules at initialization |
| RLS redesign is complex and error-prone | High | Plan RLS policies carefully; test tenant isolation deliberately |
| Service-role client is currently used for most writes | High | Must be audited and restricted; service role should not bypass tenant boundaries |
| Slug uniqueness currently global | High | Must become `(tenant_id, slug)` composite unique constraint |
| No existing CI/CD or testing framework | Medium | Add basic test infrastructure (Jest/Vitest + Playwright) early |
| Reference project has `.env.local` committed to repo (check `.gitignore`) | High | Ensure Storefy has strict `.gitignore` and never commits secrets |
| Middleware auth logic is minimal | Medium | Must be extended for tenant resolution and membership validation |

---

## 7. ARCHITECTURAL READINESS VERDICT

**The target architecture is achievable with the chosen stack.**

The reference system provides a solid foundation of patterns and tooling. However, Storefy requires:

1. A **complete database schema redesign** to introduce tenant isolation
2. A **new authorization model** based on tenant membership, not global role
3. **New tables** for tenants, members, invitations, customers, categories
4. **Modified RLS policies** to enforce tenant boundaries
5. **Storage path restructuring** for tenant namespacing
6. **Dynamic storefront rendering** based on tenant configuration
7. **Route structure changes** for tenant-specific URLs

None of these are blockers. They are well-understood problems with established solutions.

---

## 8. RECOMMENDED INITIALIZATION ORDER

The project is uninitialized. The recommended sequence is:

1. **Bootstrap** — Initialize Next.js project, install dependencies, configure TypeScript, Tailwind, shadcn/ui
2. **Supabase Setup** — Configure clients (browser, server, service), establish connection patterns
3. **Database Schema (Tenant Foundation)** — Create `tenants`, `tenant_members`, `tenant_invitations` tables + RLS
4. **Auth & Authorization** — Implement membership-based auth guards and helpers
5. **Tenant Resolution** — Implement middleware and route logic for tenant identification
6. **Core Commerce Schema** — Migrate products, orders, order_items, customers, reviews, faqs with `tenant_id`
7. **Storage** — Restructure storage paths and add tenant-scoped access controls
8. **Platform Admin** — Build super_admin capabilities
9. **Tenant Dashboard** — Build the tenant admin UI
10. **Storefront** — Build dynamic, tenant-aware storefront
11. **Remaining Modules** — Analytics, exports, settings, etc.

---

## 9. FILES TO PRESERVE (DO NOT MODIFY)

The following reference project paths must remain untouched:

```
C:\Users\Lenovo\Documents\Project\homemade-food-website\
```

This is the Amar Shopno production reference. Storefy will be built as a separate project.

---

## 10. NEXT STEP

Await the first module prompt. The Storefy repository is ready for initialization.
