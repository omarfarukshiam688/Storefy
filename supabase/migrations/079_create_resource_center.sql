-- Resource Center: Documentation
create table if not exists public.documentation_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  display_order int not null default 0,
  parent_id uuid references public.documentation_categories(id) on delete set null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documentation_categories_name_not_empty check (btrim(name) <> ''),
  constraint documentation_categories_slug_not_empty check (btrim(slug) <> '')
);

create index if not exists idx_documentation_categories_parent on public.documentation_categories(parent_id);
create index if not exists idx_documentation_categories_display_order on public.documentation_categories(display_order);
create index if not exists idx_documentation_categories_published on public.documentation_categories(is_published);

drop trigger if exists set_documentation_categories_updated_at on public.documentation_categories;
create trigger set_documentation_categories_updated_at
  before update on public.documentation_categories
  for each row execute function public.set_updated_at();

alter table public.documentation_categories enable row level security;

create policy "Public can read published documentation categories"
  on public.documentation_categories for select to anon, authenticated
  using (is_published = true);

create policy "Super admins can manage documentation categories"
  on public.documentation_categories for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.documentation_categories to anon;
grant select, insert, update, delete on public.documentation_categories to authenticated;
grant all on public.documentation_categories to service_role;

alter publication supabase_realtime add table public.documentation_categories;


create table if not exists public.documentation_articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.documentation_categories(id) on delete restrict,
  title text not null,
  slug text not null unique,
  content text not null,
  excerpt text,
  cover_image_path text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documentation_articles_title_not_empty check (btrim(title) <> ''),
  constraint documentation_articles_slug_not_empty check (btrim(slug) <> ''),
  constraint documentation_articles_content_not_empty check (btrim(content) <> '')
);

create index if not exists idx_documentation_articles_category on public.documentation_articles(category_id);
create index if not exists idx_documentation_articles_published on public.documentation_articles(is_published);
create index if not exists idx_documentation_articles_published_at on public.documentation_articles(published_at desc);
create index if not exists idx_documentation_articles_slug on public.documentation_articles(slug);

drop trigger if exists set_documentation_articles_updated_at on public.documentation_articles;
create trigger set_documentation_articles_updated_at
  before update on public.documentation_articles
  for each row execute function public.set_updated_at();

alter table public.documentation_articles enable row level security;

create policy "Public can read published documentation articles"
  on public.documentation_articles for select to anon, authenticated
  using (is_published = true);

create policy "Super admins can manage documentation articles"
  on public.documentation_articles for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.documentation_articles to anon;
grant select, insert, update, delete on public.documentation_articles to authenticated;
grant all on public.documentation_articles to service_role;

alter publication supabase_realtime add table public.documentation_articles;


create table if not exists public.documentation_feedback (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.documentation_articles(id) on delete cascade,
  is_helpful boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_documentation_feedback_article on public.documentation_feedback(article_id);

alter table public.documentation_feedback enable row level security;

create policy "Anyone can submit documentation feedback"
  on public.documentation_feedback for insert to anon, authenticated
  with check (true);

create policy "Super admins can read documentation feedback"
  on public.documentation_feedback for select to authenticated
  using (public.is_super_admin());

grant insert on public.documentation_feedback to anon;
grant insert, select on public.documentation_feedback to authenticated;
grant all on public.documentation_feedback to service_role;

alter publication supabase_realtime add table public.documentation_feedback;


-- Resource Center: Blog
create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  display_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_categories_name_not_empty check (btrim(name) <> ''),
  constraint blog_categories_slug_not_empty check (btrim(slug) <> '')
);

create index if not exists idx_blog_categories_display_order on public.blog_categories(display_order);
create index if not exists idx_blog_categories_published on public.blog_categories(is_published);

drop trigger if exists set_blog_categories_updated_at on public.blog_categories;
create trigger set_blog_categories_updated_at
  before update on public.blog_categories
  for each row execute function public.set_updated_at();

alter table public.blog_categories enable row level security;

create policy "Public can read published blog categories"
  on public.blog_categories for select to anon, authenticated
  using (is_published = true);

create policy "Super admins can manage blog categories"
  on public.blog_categories for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.blog_categories to anon;
grant select, insert, update, delete on public.blog_categories to authenticated;
grant all on public.blog_categories to service_role;

alter publication supabase_realtime add table public.blog_categories;


create table if not exists public.blog_videos (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.blog_categories(id) on delete restrict,
  title text not null,
  slug text not null unique,
  description text,
  thumbnail_path text not null,
  video_platform text not null check (video_platform in ('youtube', 'facebook')),
  video_url text not null,
  published_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_videos_title_not_empty check (btrim(title) <> ''),
  constraint blog_videos_slug_not_empty check (btrim(slug) <> ''),
  constraint blog_videos_thumbnail_not_empty check (btrim(thumbnail_path) <> ''),
  constraint blog_videos_url_not_empty check (btrim(video_url) <> '')
);

create index if not exists idx_blog_videos_category on public.blog_videos(category_id);
create index if not exists idx_blog_videos_published on public.blog_videos(is_published);
create index if not exists idx_blog_videos_published_at on public.blog_videos(published_at desc);
create index if not exists idx_blog_videos_slug on public.blog_videos(slug);

drop trigger if exists set_blog_videos_updated_at on public.blog_videos;
create trigger set_blog_videos_updated_at
  before update on public.blog_videos
  for each row execute function public.set_updated_at();

alter table public.blog_videos enable row level security;

create policy "Public can read published blog videos"
  on public.blog_videos for select to anon, authenticated
  using (is_published = true);

create policy "Super admins can manage blog videos"
  on public.blog_videos for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.blog_videos to anon;
grant select, insert, update, delete on public.blog_videos to authenticated;
grant all on public.blog_videos to service_role;

alter publication supabase_realtime add table public.blog_videos;


create table if not exists public.blog_articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.blog_categories(id) on delete restrict,
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null,
  cover_image_path text,
  author_name text,
  published_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_articles_title_not_empty check (btrim(title) <> ''),
  constraint blog_articles_slug_not_empty check (btrim(slug) <> ''),
  constraint blog_articles_content_not_empty check (btrim(content) <> '')
);

create index if not exists idx_blog_articles_category on public.blog_articles(category_id);
create index if not exists idx_blog_articles_published on public.blog_articles(is_published);
create index if not exists idx_blog_articles_published_at on public.blog_articles(published_at desc);
create index if not exists idx_blog_articles_slug on public.blog_articles(slug);

drop trigger if exists set_blog_articles_updated_at on public.blog_articles;
create trigger set_blog_articles_updated_at
  before update on public.blog_articles
  for each row execute function public.set_updated_at();

alter table public.blog_articles enable row level security;

create policy "Public can read published blog articles"
  on public.blog_articles for select to anon, authenticated
  using (is_published = true);

create policy "Super admins can manage blog articles"
  on public.blog_articles for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.blog_articles to anon;
grant select, insert, update, delete on public.blog_articles to authenticated;
grant all on public.blog_articles to service_role;

alter publication supabase_realtime add table public.blog_articles;


-- Resource Center: Changelog
create table if not exists public.changelog_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  release_date timestamptz not null,
  summary text,
  image_path text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint changelog_releases_version_not_empty check (btrim(version) <> '')
);

create index if not exists idx_changelog_releases_published on public.changelog_releases(is_published);
create index if not exists idx_changelog_releases_release_date on public.changelog_releases(release_date desc);
create index if not exists idx_changelog_releases_version on public.changelog_releases(version);

drop trigger if exists set_changelog_releases_updated_at on public.changelog_releases;
create trigger set_changelog_releases_updated_at
  before update on public.changelog_releases
  for each row execute function public.set_updated_at();

alter table public.changelog_releases enable row level security;

create policy "Public can read published changelog releases"
  on public.changelog_releases for select to anon, authenticated
  using (is_published = true);

create policy "Super admins can manage changelog releases"
  on public.changelog_releases for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.changelog_releases to anon;
grant select, insert, update, delete on public.changelog_releases to authenticated;
grant all on public.changelog_releases to service_role;

alter publication supabase_realtime add table public.changelog_releases;


create table if not exists public.changelog_entries (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.changelog_releases(id) on delete cascade,
  type text not null check (type in ('feature', 'improvement', 'bug_fix', 'security')),
  title text not null,
  description text,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint changelog_entries_title_not_empty check (btrim(title) <> '')
);

create index if not exists idx_changelog_entries_release on public.changelog_entries(release_id);
create index if not exists idx_changelog_entries_display_order on public.changelog_entries(display_order);

drop trigger if exists set_changelog_entries_updated_at on public.changelog_entries;
create trigger set_changelog_entries_updated_at
  before update on public.changelog_entries
  for each row execute function public.set_updated_at();

alter table public.changelog_entries enable row level security;

create policy "Public can read changelog entries of published releases"
  on public.changelog_entries for select to anon, authenticated
  using (
    exists (
      select 1 from public.changelog_releases cr
      where cr.id = changelog_entries.release_id
      and cr.is_published = true
    )
  );

create policy "Super admins can manage changelog entries"
  on public.changelog_entries for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.changelog_entries to anon;
grant select, insert, update, delete on public.changelog_entries to authenticated;
grant all on public.changelog_entries to service_role;

alter publication supabase_realtime add table public.changelog_entries;