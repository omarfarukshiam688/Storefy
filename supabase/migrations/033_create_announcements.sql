create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint announcements_title_not_empty check (btrim(title) <> ''),
  constraint announcements_content_not_empty check (btrim(content) <> '')
);

create index if not exists idx_announcements_published_at on public.announcements(published_at desc);
create index if not exists idx_announcements_created_at on public.announcements(created_at desc);

drop trigger if exists set_announcements_updated_at on public.announcements;
create trigger set_announcements_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

alter table public.announcements enable row level security;

create policy "Super admins can manage announcements"
  on public.announcements for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Authenticated users can read announcements"
  on public.announcements for select to authenticated
  using (true);

grant select, insert, update, delete on public.announcements to authenticated;
grant all on public.announcements to service_role;

alter publication supabase_realtime add table public.announcements;
