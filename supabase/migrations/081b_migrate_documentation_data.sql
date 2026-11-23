-- ============================================================
-- MIGRATION 081b: Migrate documentation data with validation
-- ============================================================

-- ============================================================
-- STEP 1: Cycle detection - FAIL migration if cycles exist
-- ============================================================
do $$
declare
  cycle_count int;
begin
  with recursive category_walk as (
    select
      id as start_id,
      id as current_id,
      parent_id,
      array[id] as visited_path,
      false as is_cycle
    from public.documentation_categories

    union all

    select
      w.start_id,
      parent.id as current_id,
      parent.parent_id,
      w.visited_path || parent.id,
      parent.id = any(w.visited_path) as is_cycle
    from category_walk w
    join public.documentation_categories parent
      on parent.id = w.parent_id
    where w.parent_id is not null
      and not w.is_cycle
  )
  select count(*) into cycle_count
  from category_walk
  where is_cycle;

  if cycle_count > 0 then
    raise exception 'Documentation category hierarchy contains % cycle(s). Migration aborted.', cycle_count;
  end if;
end $$;


-- ============================================================
-- STEP 2: Migrate sections with deterministic ordering
-- ============================================================
with recursive traversal as (
  -- Root categories (no parent) — ordered by display_order, then id
  select
    c.id,
    c.name,
    c.slug,
    c.description,
    c.display_order,
    c.is_published,
    c.created_at,
    c.updated_at,
    c.parent_id,
    array[c.display_order] as order_path,
    array[c.id] as id_path
  from public.documentation_categories c
  where c.parent_id is null

  union all

  -- Descendants — ordered by parent path, then display_order, then id
  select
    c.id,
    c.name,
    c.slug,
    c.description,
    c.display_order,
    c.is_published,
    c.created_at,
    c.updated_at,
    c.parent_id,
    t.order_path || c.display_order,
    t.id_path || c.id
  from public.documentation_categories c
  join traversal t on c.parent_id = t.id
), ordered_sections as (
  select
    *,
    row_number() over (order by order_path, id_path) as final_display_order
  from traversal
)
insert into public.documentation_sections (
  id, name, slug, description, display_order, is_published, created_at, updated_at
)
select
  id, name, slug, description, final_display_order, is_published, created_at, updated_at
from ordered_sections;


-- ============================================================
-- STEP 3: Migrate pages with deterministic ordering + all fields
-- ============================================================
with ordered_pages as (
  select
    a.id,
    a.category_id as section_id,
    a.title,
    a.slug,
    a.content,
    a.excerpt,
    a.cover_image_path,
    row_number() over (partition by a.category_id order by a.created_at, a.id) - 1 as display_order,
    a.is_published,
    a.published_at,
    a.created_at,
    a.updated_at
  from public.documentation_articles a
)
insert into public.documentation_pages (
  id, section_id, title, slug, content, excerpt, cover_image_path,
  display_order, is_published, published_at, created_at, updated_at
)
select
  id, section_id, title, slug, content, excerpt, cover_image_path,
  display_order, is_published, published_at, created_at, updated_at
from ordered_pages;


-- ============================================================
-- STEP 4: Verify migration invariants
-- ============================================================
do $$
declare
  legacy_section_count int;
  new_section_count int;
  legacy_article_count int;
  new_page_count int;
  orphan_pages int;
begin
  select count(*) into legacy_section_count from public.documentation_categories;
  select count(*) into new_section_count from public.documentation_sections;
  select count(*) into legacy_article_count from public.documentation_articles;
  select count(*) into new_page_count from public.documentation_pages;

  if legacy_section_count != new_section_count then
    raise exception 'Section count mismatch: legacy=%, new=%', legacy_section_count, new_section_count;
  end if;

  if legacy_article_count != new_page_count then
    raise exception 'Article count mismatch: legacy=%, new=%', legacy_article_count, new_page_count;
  end if;

  select count(*) into orphan_pages
  from public.documentation_pages p
  left join public.documentation_sections s on p.section_id = s.id
  where s.id is null;

  if orphan_pages > 0 then
    raise exception '% documentation pages have invalid section_id', orphan_pages;
  end if;

  raise notice 'Migration verification passed: % sections, % pages', new_section_count, new_page_count;
end $$;