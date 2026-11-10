# Phase 2.1 Follow-up: Subscription Status History Audit

## Assessment

The current `subscriptions` table (migration 037) preserves history by allowing multiple subscription records per tenant. However, this approach has limitations:

1. **No explicit status transition log** - Status changes (trialing → active, active → past_due, active → suspended, etc.) are not recorded with timestamps, reasons, or actor information
2. **No audit trail for administrative actions** - Manual status changes by Super Admin, automated transitions (cron jobs), or payment-driven changes are not distinguishable
3. **Difficult to query** - Getting a chronological history of a tenant's subscription lifecycle requires complex queries across multiple subscription records
4. **No correlation with payments** - Payment approval/rejection events that drive status changes are not linked to the status transition

## Current State Transitions (from 037_create_subscriptions.sql)

Valid statuses: `trialing`, `active`, `past_due`, `suspended`, `canceled`, `expired`

Important transitions to audit:
- Trial started (`trialing`)
- Subscription activated (`trialing` → `active`)
- Payment failure (`active` → `past_due`)
- Grace period started (`past_due` with `grace_period_end` set)
- Subscription suspended (`past_due` → `suspended` after grace period)
- Subscription renewed (`active` → `active` with new period)
- Subscription canceled (`active`/`past_due` → `canceled` with `canceled_at`)
- Subscription expired (`canceled` → `expired` with `ended_at`)
- Plan change scheduled/confirmed (via `scheduled_plan_id` / `scheduled_plan_change_at`)

## Recommended Implementation (Deferred to Later Phase)

Create a lightweight append-only audit table:

```sql
create table public.subscription_status_audit (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null, -- null = system/automated
  previous_status text,
  new_status text not null,
  trigger_type text not null check (trigger_type in (
    'trial_start',
    'payment_approved',
    'payment_failed',
    'grace_period_started',
    'grace_period_expired',
    'renewal',
    'manual_cancel',
    'manual_suspend',
    'manual_activate',
    'plan_change_scheduled',
    'plan_change_applied',
    'expiration',
    'system_cron'
  )),
  reason text,
  metadata jsonb, -- e.g., payment_id, plan_ids, grace_period_end
  created_at timestamptz not null default now()
);

create index on public.subscription_status_audit (subscription_id);
create index on public.subscription_status_audit (tenant_id);
create index on public.subscription_status_audit (created_at);

-- RLS: Super admins read all, tenant admins read their own
-- No insert/update/delete for tenants - only server-side via RPC/triggers
```

## Integration Points

1. **Payment approval RPC** (migration 043) - already has subscription activation logic; should emit audit record
2. **Future cron jobs** - for grace period expiration, suspension, renewal, expiration
3. **Super Admin manual actions** - status overrides via RPC
4. **Plan change flow** - scheduled and applied changes

## Scope Decision

**DEFERRED** - Not implemented in Phase 2.1 because:
- Phase 2.1 scope is payment integrity & audit protection
- Subscription lifecycle automation (cron jobs) is Phase 2.2
- Current subscription records provide adequate history for MVP
- Adding audit now would require modifying existing RPC/triggers before they're fully defined

**Recommendation**: Implement in Phase 2.2 alongside subscription lifecycle automation (cron jobs for grace period, suspension, renewal, expiration) so all status transitions are instrumented at once.