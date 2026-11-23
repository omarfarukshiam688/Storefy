import { z } from 'zod';

export const createDocumentationSectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug must be 255 characters or less').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  display_order: z.number().int().min(0).default(0),
  is_published: z.boolean().default(true),
});

export type CreateDocumentationSectionInput = z.infer<typeof createDocumentationSectionSchema>;

export const updateDocumentationSectionSchema = createDocumentationSectionSchema.partial();

export type UpdateDocumentationSectionInput = z.infer<typeof updateDocumentationSectionSchema>;

export const createDocumentationPageSchema = z.object({
  section_id: z.string().uuid('Invalid section ID'),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug must be 255 characters or less').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  content: z.string().min(1, 'Content is required').max(50000, 'Content must be 50,000 characters or less'),
  excerpt: z.string().max(500, 'Excerpt must be 500 characters or less').optional(),
  cover_image_path: z.string().optional(),
  display_order: z.number().int().min(0).default(0),
  is_published: z.boolean().default(false),
});

export type CreateDocumentationPageInput = z.infer<typeof createDocumentationPageSchema>;

export const updateDocumentationPageSchema = createDocumentationPageSchema.partial();

export type UpdateDocumentationPageInput = z.infer<typeof updateDocumentationPageSchema>;

export const createBlogCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug must be 255 characters or less').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  display_order: z.number().int().min(0).default(0),
  is_published: z.boolean().default(true),
});

export type CreateBlogCategoryInput = z.infer<typeof createBlogCategorySchema>;

export const updateBlogCategorySchema = createBlogCategorySchema.partial();

export type UpdateBlogCategoryInput = z.infer<typeof updateBlogCategorySchema>;

export const createBlogVideoSchema = z.object({
  category_id: z.string().uuid('Invalid category ID').nullable().optional(),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug must be 255 characters or less').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  thumbnail_path: z.string().min(1, 'Thumbnail is required'),
  video_platform: z.enum(['youtube', 'facebook']),
  video_url: z.string().url('Invalid URL').refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return ['youtube.com', 'www.youtube.com', 'youtu.be', 'facebook.com', 'www.facebook.com', 'fb.watch'].some(
          (domain) => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
        );
      } catch {
        return false;
      }
    },
    'Video URL must be from YouTube or Facebook'
  ),
  is_published: z.boolean().default(false),
});

export type CreateBlogVideoInput = z.infer<typeof createBlogVideoSchema>;

export const updateBlogVideoSchema = createBlogVideoSchema.partial();

export type UpdateBlogVideoInput = z.infer<typeof updateBlogVideoSchema>;

export const createBlogArticleSchema = z.object({
  category_id: z.string().uuid('Invalid category ID').nullable().optional(),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  slug: z.string().min(1, 'Slug is required').max(255, 'Slug must be 255 characters or less').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  excerpt: z.string().max(500, 'Excerpt must be 500 characters or less').optional(),
  content: z.string().min(1, 'Content is required').max(50000, 'Content must be 50,000 characters or less'),
  cover_image_path: z.string().optional(),
  author_name: z.string().max(255, 'Author name must be 255 characters or less').optional(),
  is_published: z.boolean().default(false),
});

export type CreateBlogArticleInput = z.infer<typeof createBlogArticleSchema>;

export const updateBlogArticleSchema = createBlogArticleSchema.partial();

export type UpdateBlogArticleInput = z.infer<typeof updateBlogArticleSchema>;

export const createChangelogReleaseSchema = z.object({
  version: z.string().min(1, 'Version is required').max(50, 'Version must be 50 characters or less').regex(/^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/, 'Version must follow semantic versioning (e.g., v1.0.0 or 1.0.0)'),
  release_date: z.string().datetime({ offset: true }),
  summary: z.string().max(1000, 'Summary must be 1000 characters or less').optional(),
  image_path: z.string().optional(),
  is_published: z.boolean().default(false),
});

export type CreateChangelogReleaseInput = z.infer<typeof createChangelogReleaseSchema>;

export const updateChangelogReleaseSchema = createChangelogReleaseSchema.partial();

export type UpdateChangelogReleaseInput = z.infer<typeof updateChangelogReleaseSchema>;

export const createChangelogEntrySchema = z.object({
  release_id: z.string().uuid('Invalid release ID'),
  type: z.enum(['feature', 'improvement', 'bug_fix', 'security']),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
  display_order: z.number().int().min(0).default(0),
});

export type CreateChangelogEntryInput = z.infer<typeof createChangelogEntrySchema>;

export const updateChangelogEntrySchema = createChangelogEntrySchema.partial();

export type UpdateChangelogEntryInput = z.infer<typeof updateChangelogEntrySchema>;