# Storefy — Kilo Context

## Project Purpose
Storefy is a production-oriented multi-tenant e-commerce SaaS platform. It gives small businesses their own professional online store, product management, order management, and basic analytics.

## Current Stack
- **Framework**: Next.js 16.2.11 (App Router)
- **Runtime**: React 19.2.4
- **Language**: TypeScript 5.7.3
- **Styling**: Tailwind CSS v4.3.3 + PostCSS
- **Auth**: Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`)
- **Database**: PostgreSQL via Supabase
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **Toasts**: Sonner
- **UI Primitives**: shadcn/ui style (Radix + CVA + Tailwind)
- **Dates**: date-fns

## Architecture Summary
- **App Router** with `app/` directory.
- **Server Components** by default; `"use client"` only when browser state/effects are needed.
- **Supabase SSR** for auth: cookie-based session, no localStorage for auth tokens.
- **Multi-tenant** via `tenant_id` isolation and RLS.
- **Module-based** progression: Modules 1-3 complete (tenancy + auth).

## UI Library / Component System
- **Pattern**: shadcn/ui-inspired primitives in `components/ui/`.
- **Styling**: Tailwind utility classes with semantic color tokens from `app/globals.css`.
- **Class merging**: `cn()` helper in `lib/utils.ts` (`clsx` + `tailwind-merge`).
- **Variants**: `class-variance-authority` (CVA) for button variants.

## Design System Location
- **Global tokens**: `app/globals.css`
- **Design documentation**: `DESIGN_SYSTEM.md` (root)
- **Config**: `config/site.ts`, `config/roles.ts`, `config/defaults.ts`

## Important Project Conventions
- Path alias: `@/*` maps to project root.
- Server actions/data fetching: prefer Server Components.
- Auth helpers: `lib/auth/session.ts`, `lib/auth/tenant.ts`.
- Validation: Zod schemas in `lib/validation/`.
- Supabase clients: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server), `lib/supabase/admin.ts` (service role, server-only).
- Middleware: `proxy.ts` handles auth redirects and session refresh.

## Critical "DO NOT" Rules
- Do NOT expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- Do NOT modify database schema, RLS policies, or migrations unless explicitly requested.
- Do NOT bypass RLS with client-side role checks.
- Do NOT redesign unrelated pages when implementing a feature.
- Do NOT change business logic for purely visual tasks.
- Do NOT install duplicate UI libraries.
- Do NOT use emojis as UI icons.
- Do NOT hardcode arbitrary colors; use semantic tokens.

## Where Reusable Components Live
- **Primitives**: `components/ui/`
- **Auth**: `components/auth/`
- **Admin**: `components/admin/`
- **Storefront**: `components/storefront/` (empty, future)
- **Shared**: `components/shared/` (empty, future)

## How Kilo Should Approach Future UI Tasks
1. Read `DESIGN_SYSTEM.md` before touching any UI.
2. Inspect existing components in `components/ui/` and `components/auth/` before creating new ones.
3. Reuse primitives; avoid duplicating Button, Input, Card, etc.
4. Use semantic Tailwind tokens (`bg-primary`, `text-muted-foreground`, `border-border`).
5. Preserve existing auth logic and server/client boundaries.
6. Run `next build` and `eslint` before declaring completion.
7. Do not modify files outside the task scope.
