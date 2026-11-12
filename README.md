# Storefy

Multi-tenant SaaS platform that gives small businesses their own professional online store — product catalog, orders, customers, reviews, team/invitations, analytics, announcements, notifications, and subscriptions — with super-admin platform management.

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- [Supabase](https://supabase.com/) — Auth, PostgreSQL, Storage, Row Level Security (RLS)
- [date-fns](https://date-fns.org/), [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/), [Sonner](https://sonner.emilkowal.ski/), [Lucide React](https://lucide.dev/)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your Supabase credentials (URL, anon key, service role key).

3. Apply the Supabase migrations in `supabase/migrations/` (via Supabase CLI `supabase db push` or the Supabase Dashboard SQL editor).

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run start` — Start production server
- `npm run lint` — Run ESLint

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md).

## Payment status

Trusted server-side subscription payment creation and Super Admin manual payment verification are implemented. Automated gateway session creation, callback/IPN handling, server-to-server validation, and automated settlement are **not** yet implemented (see `docs/architecture/PAYMENT_SETTLEMENT_ARCHITECTURE.md`).
