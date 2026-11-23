-- ============================================================
-- MIGRATION 082: Make blog category_id nullable
-- ============================================================

-- Make blog_videos.category_id nullable
alter table public.blog_videos alter column category_id drop not null;

-- Blog articles: make category_id nullable
alter table public.blog_articles alter column category_id drop not null;

-- Keep legacy blog_categories table as-is (not renamed, not dropped)
-- Existing category relationships preserved
-- New content can be created without category