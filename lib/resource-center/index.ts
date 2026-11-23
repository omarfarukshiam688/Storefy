import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type {
  DocumentationCategory,
  DocumentationArticle,
  DocumentationFeedback,
  BlogCategory,
  BlogVideo,
  BlogArticle,
  ChangelogRelease,
  ChangelogEntry,
} from '@/types';

export type {
  DocumentationCategory,
  DocumentationArticle,
  DocumentationFeedback,
  BlogCategory,
  BlogVideo,
  BlogArticle,
  ChangelogRelease,
  ChangelogEntry,
};

export interface DocumentationCategoryWithArticles extends DocumentationCategory {
  articles: DocumentationArticle[];
  children: DocumentationCategoryWithArticles[];
}

export interface BlogCategoryWithContent extends BlogCategory {
  videos: BlogVideo[];
  articles: BlogArticle[];
}

export interface ChangelogReleaseWithEntries extends ChangelogRelease {
  entries: ChangelogEntry[];
}

export interface ResourceCenterOverview {
  documentationCategories: DocumentationCategoryWithArticles[];
  blogCategories: BlogCategoryWithContent[];
  changelogReleases: ChangelogReleaseWithEntries[];
}

async function buildDocumentationTree(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<DocumentationCategoryWithArticles[]> {
  const { data: categories } = await supabase
    .from('documentation_categories')
    .select('*')
    .eq('is_published', true)
    .order('display_order', { ascending: true });

  const { data: articles } = await supabase
    .from('documentation_articles')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (!categories) return [];

  const categoryMap = new Map<string, DocumentationCategoryWithArticles>();
  const rootCategories: DocumentationCategoryWithArticles[] = [];

  for (const cat of categories) {
    categoryMap.set(cat.id, {
      ...cat,
      articles: [],
      children: [],
    });
  }

  for (const cat of categories) {
    const node = categoryMap.get(cat.id)!;
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      categoryMap.get(cat.parent_id)!.children.push(node);
    } else {
      rootCategories.push(node);
    }
  }

  if (articles) {
    for (const article of articles) {
      const category = categoryMap.get(article.category_id);
      if (category) {
        category.articles.push(article);
      }
    }
  }

  return rootCategories;
}

export async function getResourceCenterOverview(): Promise<ResourceCenterOverview> {
  const supabase = await createClient();

  const [documentationCategories, blogCategories, changelogReleases] = await Promise.all([
    buildDocumentationTree(supabase),
    getBlogCategoriesWithContent(supabase),
    getChangelogReleasesWithEntries(supabase),
  ]);

  return {
    documentationCategories,
    blogCategories,
    changelogReleases,
  };
}

async function getBlogCategoriesWithContent(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<BlogCategoryWithContent[]> {
  const [{ data: categories }, { data: videos }, { data: articles }] = await Promise.all([
    supabase
      .from('blog_categories')
      .select('*')
      .eq('is_published', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('blog_videos')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false }),
    supabase
      .from('blog_articles')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false }),
  ]);

  if (!categories) return [];

  const categoryMap = new Map<string, BlogCategoryWithContent>();

  for (const cat of categories) {
    categoryMap.set(cat.id, { ...cat, videos: [], articles: [] });
  }

  if (videos) {
    for (const video of videos) {
      const category = categoryMap.get(video.category_id);
      if (category) category.videos.push(video);
    }
  }

  if (articles) {
    for (const article of articles) {
      const category = categoryMap.get(article.category_id);
      if (category) category.articles.push(article);
    }
  }

  return Array.from(categoryMap.values());
}

async function getChangelogReleasesWithEntries(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ChangelogReleaseWithEntries[]> {
  const [{ data: releases }, { data: entries }] = await Promise.all([
    supabase
      .from('changelog_releases')
      .select('*')
      .eq('is_published', true)
      .order('release_date', { ascending: false }),
    supabase
      .from('changelog_entries')
      .select('*')
      .order('display_order', { ascending: true }),
  ]);

  if (!releases) return [];

  const releaseMap = new Map<string, ChangelogReleaseWithEntries>();

  for (const release of releases) {
    releaseMap.set(release.id, { ...release, entries: [] });
  }

  if (entries) {
    for (const entry of entries) {
      const release = releaseMap.get(entry.release_id);
      if (release) release.entries.push(entry);
    }
  }

  return Array.from(releaseMap.values());
}

export async function listDocumentationCategories(
  includeUnpublished = false
): Promise<DocumentationCategory[]> {
  const supabase = await createClient();

  let query = supabase.from('documentation_categories').select('*').order('display_order', { ascending: true });

  if (!includeUnpublished) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch documentation categories: ${error.message}`);
  }

  return (data ?? []) as DocumentationCategory[];
}

export async function getDocumentationCategory(id: string): Promise<DocumentationCategory> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('documentation_categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Documentation category not found');
  }

  return data as DocumentationCategory;
}

export async function listDocumentationArticles(
  categoryId?: string,
  includeUnpublished = false
): Promise<DocumentationArticle[]> {
  const supabase = await createClient();

  let query = supabase
    .from('documentation_articles')
    .select('*')
    .order('created_at', { ascending: false });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (!includeUnpublished) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch documentation articles: ${error.message}`);
  }

  return (data ?? []) as DocumentationArticle[];
}

export async function getDocumentationArticleBySlug(slug: string): Promise<DocumentationArticle> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('documentation_articles')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Documentation article not found');
  }

  return data as DocumentationArticle;
}

export async function getDocumentationArticle(id: string): Promise<DocumentationArticle> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('documentation_articles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Documentation article not found');
  }

  return data as DocumentationArticle;
}

export async function createDocumentationCategory(input: {
  name: string;
  slug: string;
  description?: string;
  display_order?: number;
  parent_id?: string | null;
  is_published?: boolean;
}): Promise<DocumentationCategory> {
  const supabase = await createClient();

  const payload = {
    name: input.name.trim(),
    slug: input.slug.trim(),
    description: input.description?.trim() ?? null,
    display_order: input.display_order ?? 0,
    parent_id: input.parent_id ?? undefined,
    is_published: input.is_published ?? true,
  };

  const { data, error } = await supabase
    .from('documentation_categories')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create documentation category');
  }

  return data as DocumentationCategory;
}

export async function updateDocumentationCategory(
  id: string,
  input: Partial<{
    name: string;
    slug: string;
    description: string;
    display_order: number;
    parent_id: string | null;
    is_published: boolean;
  }>
): Promise<DocumentationCategory> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.slug !== undefined) payload.slug = input.slug.trim();
  if (input.description !== undefined) payload.description = input.description?.trim() ?? null;
  if (input.display_order !== undefined) payload.display_order = input.display_order;
  if (input.parent_id !== undefined) payload.parent_id = input.parent_id;
  if (input.is_published !== undefined) payload.is_published = input.is_published;

  const { data, error } = await supabase
    .from('documentation_categories')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update documentation category');
  }

  return data as DocumentationCategory;
}

export async function deleteDocumentationCategory(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('documentation_categories').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete documentation category: ${error.message}`);
  }
}

export async function createDocumentationArticle(input: {
  category_id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  cover_image_path?: string;
  is_published?: boolean;
}): Promise<DocumentationArticle> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    category_id: input.category_id,
    title: input.title.trim(),
    slug: input.slug.trim(),
    content: input.content.trim(),
    excerpt: input.excerpt?.trim() ?? null,
    cover_image_path: input.cover_image_path ?? null,
    is_published: input.is_published ?? false,
  };

  if (input.is_published) {
    payload.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('documentation_articles')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create documentation article');
  }

  return data as DocumentationArticle;
}

export async function updateDocumentationArticle(
  id: string,
  input: Partial<{
    category_id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    cover_image_path: string | null;
    is_published: boolean;
  }>
): Promise<DocumentationArticle> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};

  if (input.category_id !== undefined) payload.category_id = input.category_id;
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.slug !== undefined) payload.slug = input.slug.trim();
  if (input.content !== undefined) payload.content = input.content.trim();
  if (input.excerpt !== undefined) payload.excerpt = input.excerpt?.trim() ?? null;
  if (input.cover_image_path !== undefined) payload.cover_image_path = input.cover_image_path;
  if (input.is_published !== undefined) {
    payload.is_published = input.is_published;
    if (input.is_published) {
      payload.published_at = new Date().toISOString();
    } else {
      payload.published_at = null;
    }
  }

  const { data, error } = await supabase
    .from('documentation_articles')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update documentation article');
  }

  return data as DocumentationArticle;
}

export async function deleteDocumentationArticle(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('documentation_articles').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete documentation article: ${error.message}`);
  }
}

export async function submitDocumentationFeedback(
  articleId: string,
  isHelpful: boolean
): Promise<DocumentationFeedback> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('documentation_feedback')
    .insert({ article_id: articleId, is_helpful: isHelpful })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to submit feedback');
  }

  return data as DocumentationFeedback;
}

export async function listBlogCategories(
  includeUnpublished = false
): Promise<BlogCategory[]> {
  const supabase = await createClient();

  let query = supabase.from('blog_categories').select('*').order('display_order', { ascending: true });

  if (!includeUnpublished) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch blog categories: ${error.message}`);
  }

  return (data ?? []) as BlogCategory[];
}

export async function listBlogVideos(
  categoryId?: string,
  includeUnpublished = false
): Promise<BlogVideo[]> {
  const supabase = await createClient();

  let query = supabase
    .from('blog_videos')
    .select('*')
    .order('published_at', { ascending: false });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (!includeUnpublished) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch blog videos: ${error.message}`);
  }

  return (data ?? []) as BlogVideo[];
}

export async function getBlogVideoBySlug(slug: string): Promise<BlogVideo> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('blog_videos')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Blog video not found');
  }

  return data as BlogVideo;
}

export async function listBlogArticles(
  categoryId?: string,
  includeUnpublished = false
): Promise<BlogArticle[]> {
  const supabase = await createClient();

  let query = supabase
    .from('blog_articles')
    .select('*')
    .order('published_at', { ascending: false });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (!includeUnpublished) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch blog articles: ${error.message}`);
  }

  return (data ?? []) as BlogArticle[];
}

export async function getBlogArticleBySlug(slug: string): Promise<BlogArticle & { categoryName?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('blog_articles')
    .select(`
      *,
      blog_categories!inner(name)
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Blog article not found');
  }

  return {
    ...data,
    categoryName: (data as { blog_categories?: { name: string } }).blog_categories?.name,
  } as BlogArticle & { categoryName?: string };
}

export async function createBlogCategory(input: {
  name: string;
  slug: string;
  description?: string;
  display_order?: number;
  is_published?: boolean;
}): Promise<BlogCategory> {
  const supabase = await createClient();

  const payload = {
    name: input.name.trim(),
    slug: input.slug.trim(),
    description: input.description?.trim() ?? null,
    display_order: input.display_order ?? 0,
    is_published: input.is_published ?? true,
  };

  const { data, error } = await supabase
    .from('blog_categories')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create blog category');
  }

  return data as BlogCategory;
}

export async function updateBlogCategory(
  id: string,
  input: Partial<{
    name: string;
    slug: string;
    description: string;
    display_order: number;
    is_published: boolean;
  }>
): Promise<BlogCategory> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.slug !== undefined) payload.slug = input.slug.trim();
  if (input.description !== undefined) payload.description = input.description?.trim() ?? null;
  if (input.display_order !== undefined) payload.display_order = input.display_order;
  if (input.is_published !== undefined) payload.is_published = input.is_published;

  const { data, error } = await supabase
    .from('blog_categories')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update blog category');
  }

  return data as BlogCategory;
}

export async function deleteBlogCategory(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('blog_categories').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete blog category: ${error.message}`);
  }
}

export async function createBlogVideo(input: {
  category_id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnail_path: string;
  video_platform: 'youtube' | 'facebook';
  video_url: string;
  is_published?: boolean;
}): Promise<BlogVideo> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    category_id: input.category_id,
    title: input.title.trim(),
    slug: input.slug.trim(),
    description: input.description?.trim() ?? null,
    thumbnail_path: input.thumbnail_path,
    video_platform: input.video_platform,
    video_url: input.video_url,
    is_published: input.is_published ?? false,
  };

  if (input.is_published) {
    payload.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('blog_videos')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create blog video');
  }

  return data as BlogVideo;
}

export async function updateBlogVideo(
  id: string,
  input: Partial<{
    category_id: string;
    title: string;
    slug: string;
    description: string;
    thumbnail_path: string;
    video_platform: 'youtube' | 'facebook';
    video_url: string;
    is_published: boolean;
  }>
): Promise<BlogVideo> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};

  if (input.category_id !== undefined) payload.category_id = input.category_id;
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.slug !== undefined) payload.slug = input.slug.trim();
  if (input.description !== undefined) payload.description = input.description?.trim() ?? null;
  if (input.thumbnail_path !== undefined) payload.thumbnail_path = input.thumbnail_path;
  if (input.video_platform !== undefined) payload.video_platform = input.video_platform;
  if (input.video_url !== undefined) payload.video_url = input.video_url;
  if (input.is_published !== undefined) {
    payload.is_published = input.is_published;
    if (input.is_published) {
      payload.published_at = new Date().toISOString();
    } else {
      payload.published_at = null;
    }
  }

  const { data, error } = await supabase
    .from('blog_videos')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update blog video');
  }

  return data as BlogVideo;
}

export async function deleteBlogVideo(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('blog_videos').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete blog video: ${error.message}`);
  }
}

export async function createBlogArticle(input: {
  category_id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  cover_image_path?: string;
  author_name?: string;
  is_published?: boolean;
}): Promise<BlogArticle> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    category_id: input.category_id,
    title: input.title.trim(),
    slug: input.slug.trim(),
    excerpt: input.excerpt?.trim() ?? null,
    content: input.content.trim(),
    cover_image_path: input.cover_image_path ?? null,
    author_name: input.author_name?.trim() ?? null,
    is_published: input.is_published ?? false,
  };

  if (input.is_published) {
    payload.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('blog_articles')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create blog article');
  }

  return data as BlogArticle;
}

export async function updateBlogArticle(
  id: string,
  input: Partial<{
    category_id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    cover_image_path: string | null;
    author_name: string;
    is_published: boolean;
  }>
): Promise<BlogArticle> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};

  if (input.category_id !== undefined) payload.category_id = input.category_id;
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.slug !== undefined) payload.slug = input.slug.trim();
  if (input.excerpt !== undefined) payload.excerpt = input.excerpt?.trim() ?? null;
  if (input.content !== undefined) payload.content = input.content.trim();
  if (input.cover_image_path !== undefined) payload.cover_image_path = input.cover_image_path;
  if (input.author_name !== undefined) payload.author_name = input.author_name?.trim() ?? null;
  if (input.is_published !== undefined) {
    payload.is_published = input.is_published;
    if (input.is_published) {
      payload.published_at = new Date().toISOString();
    } else {
      payload.published_at = null;
    }
  }

  const { data, error } = await supabase
    .from('blog_articles')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update blog article');
  }

  return data as BlogArticle;
}

export async function deleteBlogArticle(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('blog_articles').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete blog article: ${error.message}`);
  }
}

export async function listChangelogReleases(
  includeUnpublished = false
): Promise<ChangelogRelease[]> {
  const supabase = await createClient();

  let query = supabase
    .from('changelog_releases')
    .select('*')
    .order('release_date', { ascending: false });

  if (!includeUnpublished) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch changelog releases: ${error.message}`);
  }

  return (data ?? []) as ChangelogRelease[];
}

export async function getChangelogReleaseByVersion(version: string): Promise<ChangelogRelease> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('changelog_releases')
    .select('*')
    .eq('version', version)
    .eq('is_published', true)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Changelog release not found');
  }

  return data as ChangelogRelease;
}

export async function getChangelogRelease(id: string): Promise<ChangelogRelease> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('changelog_releases')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Changelog release not found');
  }

  return data as ChangelogRelease;
}

export async function listChangelogEntries(releaseId: string): Promise<ChangelogEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('changelog_entries')
    .select('*')
    .eq('release_id', releaseId)
    .order('display_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch changelog entries: ${error.message}`);
  }

  return (data ?? []) as ChangelogEntry[];
}

export async function createChangelogRelease(input: {
  version: string;
  release_date: string;
  summary?: string;
  image_path?: string;
  is_published?: boolean;
}): Promise<ChangelogRelease> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    version: input.version.trim(),
    release_date: input.release_date,
    summary: input.summary?.trim() ?? null,
    image_path: input.image_path ?? null,
    is_published: input.is_published ?? false,
  };

  if (input.is_published) {
    payload.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('changelog_releases')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create changelog release');
  }

  return data as ChangelogRelease;
}

export async function updateChangelogRelease(
  id: string,
  input: Partial<{
    version: string;
    release_date: string;
    summary: string;
    image_path: string | null;
    is_published: boolean;
  }>
): Promise<ChangelogRelease> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};

  if (input.version !== undefined) payload.version = input.version.trim();
  if (input.release_date !== undefined) payload.release_date = input.release_date;
  if (input.summary !== undefined) payload.summary = input.summary?.trim() ?? null;
  if (input.image_path !== undefined) payload.image_path = input.image_path;
  if (input.is_published !== undefined) {
    payload.is_published = input.is_published;
    if (input.is_published) {
      payload.published_at = new Date().toISOString();
    } else {
      payload.published_at = null;
    }
  }

  const { data, error } = await supabase
    .from('changelog_releases')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update changelog release');
  }

  return data as ChangelogRelease;
}

export async function deleteChangelogRelease(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('changelog_releases').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete changelog release: ${error.message}`);
  }
}

export async function createChangelogEntry(input: {
  release_id: string;
  type: 'feature' | 'improvement' | 'bug_fix' | 'security';
  title: string;
  description?: string;
  display_order?: number;
}): Promise<ChangelogEntry> {
  const supabase = await createClient();

  const payload = {
    release_id: input.release_id,
    type: input.type,
    title: input.title.trim(),
    description: input.description?.trim() ?? null,
    display_order: input.display_order ?? 0,
  };

  const { data, error } = await supabase
    .from('changelog_entries')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create changelog entry');
  }

  return data as ChangelogEntry;
}

export async function updateChangelogEntry(
  id: string,
  input: Partial<{
    type: 'feature' | 'improvement' | 'bug_fix' | 'security';
    title: string;
    description: string;
    display_order: number;
  }>
): Promise<ChangelogEntry> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};

  if (input.type !== undefined) payload.type = input.type;
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.description !== undefined) payload.description = input.description?.trim() ?? null;
  if (input.display_order !== undefined) payload.display_order = input.display_order;

  const { data, error } = await supabase
    .from('changelog_entries')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update changelog entry');
  }

  return data as ChangelogEntry;
}

export async function deleteChangelogEntry(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('changelog_entries').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete changelog entry: ${error.message}`);
  }
}