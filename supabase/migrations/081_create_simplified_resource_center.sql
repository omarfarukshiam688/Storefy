-- ============================================================
-- MIGRATION 081: Create simplified Resource Center tables
-- ============================================================

-- Documentation sections (flat, replaces documentation_categories hierarchy)
create table if not exists public.documentation_sections (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  description     text,
  display_order   int not null default 0,
  is_published    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint documentation_sections_name_not_empty check (btrim(name) <> ''),
  constraint documentation_sections_slug_not_empty check (btrim(slug) <> '')
);

create index if not exists idx_documentation_sections_display_order
  on public.documentation_sections(display_order);
create index if not exists idx_documentation_sections_published
  on public.documentation_sections(is_published);
create index if not exists idx_documentation_sections_slug
  on public.documentation_sections(slug);

drop trigger if exists set_documentation_sections_updated_at on public.documentation_sections;
create trigger set_documentation_sections_updated_at
  before update on public.documentation_sections
  for each row execute function public.set_updated_at();

alter table public.documentation_sections enable row level security;

create policy "Public can read published documentation sections"
  on public.documentation_sections for select to anon, authenticated
  using (is_published = true);

create policy "Super admins can manage documentation sections"
  on public.documentation_sections for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.documentation_sections to anon;
grant select, insert, update, delete on public.documentation_sections to authenticated;
grant all on public.documentation_sections to service_role;

alter publication supabase_realtime add table public.documentation_sections;


-- Documentation pages (replaces documentation_articles, with section_id FK and display_order)
create table if not exists public.documentation_pages (
  id                 uuid primary key default gen_random_uuid(),
  section_id         uuid not null references public.documentation_sections(id) on delete restrict,
  title              text not null,
  slug               text not null unique,
  content            text not null,
  excerpt            text,
  cover_image_path   text,
  display_order      int not null default 0,
  is_published       boolean not null default false,
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint documentation_pages_title_not_empty check (btrim(title) <> ''),
  constraint documentation_pages_slug_not_empty check (btrim(slug) <> ''),
  constraint documentation_pages_content_not_empty check (btrim(content) <> '')
);

create index if not exists idx_documentation_pages_section
  on public.documentation_pages(section_id);
create index if not exists idx_documentation_pages_section_order
  on public.documentation_pages(section_id, display_order);
create index if not exists idx_documentation_pages_published
  on public.documentation_pages(is_published);
create index if not exists idx_documentation_pages_slug
  on public.documentation_pages(slug);

drop trigger if exists set_documentation_pages_updated_at on public.documentation_pages;
create trigger set_documentation_pages_updated_at
  before update on public.documentation_pages
  for each row execute function public.set_updated_at();

alter table public.documentation_pages enable row level security;

-- Public: published pages in published sections only
create policy "Public can read published documentation pages"
  on public.documentation_pages for select to anon, authenticated
  using (
    is_published = true
    and exists (
      select 1 from public.documentation_sections s
      where s.id = documentation_pages.section_id
      and s.is_published = true
    )
  );

-- Super admin: full access
create policy "Super admins can manage documentation pages"
  on public.documentation_pages for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.documentation_pages to anon;
grant select, insert, update, delete on public.documentation_pages to authenticated;
grant all on public.documentation_pages to service_role;

alter publication supabase_realtime add table public.documentation_pages;


-- Blog videos: make category_id nullable
alter table public.blog_videos alter column category_id drop not null;

-- Blog articles: make category_id nullable
alter table public.blog_articles alter column category_id drop not null;

-- Keep legacy blog_categories table (not renamed in this migration)
-- No new blog categories table needed