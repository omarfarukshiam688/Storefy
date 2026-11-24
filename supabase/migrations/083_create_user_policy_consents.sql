create table if not exists public.user_policy_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  privacy_policy_version text not null,
  terms_version text not null,
  privacy_policy_accepted boolean not null,
  terms_accepted boolean not null,
  accepted_at timestamptz not null default now(),
  constraint user_policy_consents_privacy_accepted check (privacy_policy_accepted),
  constraint user_policy_consents_terms_accepted check (terms_accepted),
  constraint user_policy_consents_privacy_version_nonempty check (btrim(privacy_policy_version) <> ''),
  constraint user_policy_consents_terms_version_nonempty check (btrim(terms_version) <> ''),
  constraint user_policy_consents_unique_versions
    unique (user_id, privacy_policy_version, terms_version)
);

create index if not exists idx_user_policy_consents_user_accepted
  on public.user_policy_consents (user_id, accepted_at desc);

alter table public.user_policy_consents enable row level security;

revoke all on public.user_policy_consents from anon, authenticated;
grant select on public.user_policy_consents to authenticated;
grant all on public.user_policy_consents to service_role;

drop policy if exists "Users can read their own policy consents"
  on public.user_policy_consents;
create policy "Users can read their own policy consents"
  on public.user_policy_consents for select to authenticated
  using (user_id = auth.uid());

create or replace function public.record_signup_policy_consent()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  consent jsonb := new.raw_user_meta_data -> 'legal_consent';
  privacy_version text;
  terms_version text;
begin
  if jsonb_typeof(consent) is distinct from 'object'
    or (consent -> 'privacy_accepted') is distinct from 'true'::jsonb
    or (consent -> 'terms_accepted') is distinct from 'true'::jsonb then
    raise exception 'Sign-up requires explicit acceptance of both legal policies'
      using errcode = '23514';
  end if;

  privacy_version := nullif(btrim(consent ->> 'privacy_policy_version'), '');
  terms_version := nullif(btrim(consent ->> 'terms_version'), '');

  if privacy_version is null or length(privacy_version) > 32
    or terms_version is null or length(terms_version) > 32 then
    raise exception 'Sign-up requires valid legal policy versions'
      using errcode = '23514';
  end if;

  insert into public.user_policy_consents (
    user_id,
    privacy_policy_version,
    terms_version,
    privacy_policy_accepted,
    terms_accepted
  )
  values (
    new.id,
    privacy_version,
    terms_version,
    true,
    true
  )
  on conflict (user_id, privacy_policy_version, terms_version) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_policy_consent on auth.users;
create trigger on_auth_user_policy_consent
  after insert on auth.users
  for each row execute function public.record_signup_policy_consent();

revoke all on function public.record_signup_policy_consent()
  from public, anon, authenticated, service_role;
