# Storefy — Architecture

## Purpose

Storefy is a multi-tenant SaaS platform that gives small businesses their own professional online store, product management, order management, and basic analytics without requiring a custom website.

## High-Level Architecture

```
Storefy Platform
│
├── Tenant A (e.g., Amar Shopno)
│   ├── Storefront
│   ├── Admin Dashboard
│   ├── Products
│   ├── Orders
│   └── Customers
│
├── Tenant B
│   └── ...
│
└── Shared Infrastructure
    ├── Next.js Application
    ├── PostgreSQL Database
    ├── Supabase Auth
    └── Supabase Storage
```

## Directory Responsibilities

### `app/`

Routing, pages, layouts, and API route handlers. This is the request/response boundary.

- Keep page components thin.
- Delegate business logic to `lib/`.
- Do not put database queries directly in components when they can be moved to `lib/`.

### `components/`

Presentation and UI. Reusable client components.

- `components/ui/` — shadcn/ui primitives
- `components/shared/` — cross-cutting UI (headers, footers, etc.)
- `components/storefront/` — tenant-facing storefront components
- `components/admin/` — tenant admin UI
- `components/platform/` — platform admin UI

Components should not contain complex database logic.

### `lib/`

Business logic, data access, and infrastructure utilities organized by domain.

- `lib/supabase/` — Supabase clients (browser, server, service-role)
- `lib/auth/` — authentication helpers
- `lib/tenants/` — tenant resolution and membership checks
- `lib/products/` — product domain logic
- `lib/orders/` — order domain logic
- `lib/customers/` — customer domain logic
- `lib/reviews/` — review domain logic
- `lib/analytics/` — analytics calculations
- `lib/storage/` — Supabase Storage utilities
- `lib/validation/` — Zod schemas and validation helpers
- `lib/rate-limit/` — rate limiting utilities
- `lib/utils/` — shared utilities (`cn`, etc.)

### `config/`

Application configuration constants.

- `config/site.ts` — public site metadata
- `config/roles.ts` — role definitions and hierarchy
- `config/defaults.ts` — default values (currency, locale, paths)

Do not put secrets in `config/`.

### `types/`

Shared TypeScript types representing domain concepts.

Prefer explicit domain types over generic abstractions.

### `supabase/`

Database migrations and SQL development assets.

All schema changes must be represented as migrations.

## Domain Boundaries

### Identity

Users, profiles, authentication, and authorization.

### Tenancy

Tenants, memberships, tenant settings, and tenant resolution.

### Commerce

Products, categories, orders, order items, and customers.

### Engagement

Reviews and FAQs.

### Operations

Analytics, rate limiting, and storage management.

### Platform

Plans, tenant management, and platform administration.

## Server / Client Boundary

Default to Server Components.

Use `"use client"` only when:
- Browser state or effects are required
- Client-side interactivity is needed (modals, forms with local state)
- Browser APIs are used

Never expose Supabase service-role credentials or secrets to the browser.

## Generic vs Tenant-Specific

All business logic must be generic.

Never hardcode tenant-specific data (names, prices, branding, URLs) inside generic Storefy code.

Tenant data belongs in:
- Database seed data
- Tenant configuration records
- Tenant-scoped storage paths

## Dependency Direction

UI depends on Application/Domain Logic, which depends on Infrastructure.

```
Components
   ↓
lib/ (business logic, data access)
   ↓
Supabase / Database
```

Avoid the reverse.

## Multi-Tenancy Principles

- Shared PostgreSQL database with `tenant_id` isolation
- Row Level Security (RLS) enforced at the database layer
- Tenant resolution from subdomain or path
- Storage paths namespaced by tenant
- Authorization based on tenant membership + role, not global profile role

## Important Rules

1. Never trust frontend filtering for tenant isolation.
2. Never expose service-role keys to the client.
3. Never hardcode tenant data in generic components.
4. Always validate tenant membership before tenant-scoped operations.
5. Keep the architecture simple; avoid premature optimization.
