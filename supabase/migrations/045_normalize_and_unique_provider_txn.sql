-- Safe normalization of existing payment provider data and duplicate detection
-- This migration normalizes existing data, detects collisions, and stops if unresolved duplicates exist.
-- All operations run in ONE explicit transaction with EXCLUSIVE lock held until COMMIT.

BEGIN;

-- Step 1: Acquire EXCLUSIVE lock FIRST - blocks all concurrent writes
lock table public.payments in exclusive mode;

-- Step 2: Create normalization function (inside transaction)
create or replace function public.normalize_payment_provider_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Normalize provider to lowercase
  if new.provider is not null then
    new.provider := lower(trim(new.provider));
  end if;

  -- Normalize provider_transaction_id: trim whitespace
  -- Note: We do NOT lowercase transaction IDs as some providers may use case-sensitive IDs
  if new.provider_transaction_id is not null then
    new.provider_transaction_id := trim(new.provider_transaction_id);
  end if;

  return new;
end;
$$;

-- Step 3: Apply trigger to payments table (will handle future inserts/updates)
drop trigger if exists normalize_payment_provider_fields on public.payments;
create trigger normalize_payment_provider_fields
  before insert or update on public.payments
  for each row execute function public.normalize_payment_provider_fields();

-- Step 4: Normalize EXISTING records using the same logic
-- This runs once during migration to fix historical data
update public.payments
set provider = lower(trim(provider)),
    provider_transaction_id = case
      when provider_transaction_id is not null then trim(provider_transaction_id)
      else null
    end
where provider is not null
  or provider_transaction_id is not null;

-- Step 5: Check for duplicates AFTER normalization
-- Uses normalized values: lower(trim(provider)) and trim(provider_transaction_id)
-- If duplicates exist, report them clearly and stop migration (rollback)
do $$
declare
  v_duplicates text;
begin
  select string_agg(
    format('provider=%s, provider_transaction_id=%s, count=%s, payment_ids=%s',
      provider,
      provider_transaction_id,
      cnt,
      payment_ids
    ), '; '
  )
  into v_duplicates
  from (
    select
      provider,
      provider_transaction_id,
      count(*) as cnt,
      string_agg(id::text, ',') as payment_ids
    from public.payments
    where provider_transaction_id is not null
      and trim(provider_transaction_id) <> ''
    group by provider, provider_transaction_id
    having count(*) > 1
  ) dups;

  if v_duplicates is not null then
    raise exception 'Found duplicate provider transaction IDs after normalization. Migration aborted. Duplicates: %', v_duplicates;
  end if;
end $$;

-- Step 6: Create unique partial index (now safe because data is normalized and collision-free)
create unique index if not exists idx_payments_provider_txn_unique
  on public.payments (provider, provider_transaction_id)
  where provider_transaction_id is not null
    and trim(provider_transaction_id) <> '';

-- Step 7: Grants for normalization function
revoke execute on function public.normalize_payment_provider_fields() from public;
grant execute on function public.normalize_payment_provider_fields() to service_role;

COMMIT;