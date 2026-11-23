'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { BookOpen, Video, Newspaper, GitPullRequest, Settings, Plus, Search, Save, Edit, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ResourceCenterImageUpload } from '@/components/resource-center/image-upload';

const sections = [
  { id: 'overview', label: 'Overview', icon: Settings },
  { id: 'documentation', label: 'Documentation', icon: BookOpen },
  { id: 'blog', label: 'Blog', icon: Video },
  { id: 'changelog', label: 'Changelog', icon: GitPullRequest },
] as const;

type SectionId = typeof sections[number]['id'];

export function ResourceCenterClient() {
  const [activeSection, setActiveSection] = useState<SectionId>('overview');

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">
            <Settings className="h-3.5 w-3.5" />
            Resource Center
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.06em] text-slate-900">
            Manage Resource Center
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage documentation, blog content, and changelog releases.
          </p>
        </div>
      </header>

      <nav aria-label="Resource Center sections" className="flex flex-wrap gap-2 border-b border-violet-100 pb-4">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveSection(section.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
              activeSection === section.id
                ? 'bg-violet-100/80 text-violet-700 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.12)]'
                : 'text-slate-600 hover:bg-violet-50 hover:text-slate-900'
            )}
          >
            <section.icon className="h-4 w-4" aria-hidden="true" />
            <span>{section.label}</span>
          </button>
        ))}
      </nav>

      {activeSection === 'overview' && <ResourceCenterOverview />}
      {activeSection === 'documentation' && <DocumentationManagement />}
      {activeSection === 'blog' && <BlogManagement />}
      {activeSection === 'changelog' && <ChangelogManagement />}
    </div>
  );
}

function ResourceCenterOverview() {
  const stats = [
    { label: 'Documentation Categories', value: '0', icon: BookOpen, color: 'text-violet-700 bg-violet-50' },
    { label: 'Documentation Articles', value: '0', icon: BookOpen, color: 'text-violet-700 bg-violet-50' },
    { label: 'Blog Categories', value: '0', icon: Video, color: 'text-sky-700 bg-sky-50' },
    { label: 'Blog Videos', value: '0', icon: Video, color: 'text-sky-700 bg-sky-50' },
    { label: 'Blog Articles', value: '0', icon: Newspaper, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Changelog Releases', value: '0', icon: GitPullRequest, color: 'text-amber-700 bg-amber-50' },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-violet-100 bg-white/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{stat.label}</CardTitle>
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', stat.color)}>
                <stat.icon className="h-5 w-5" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-slate-900">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-violet-100 bg-white/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-3" asChild>
              <a href="/platform/resource-center/documentation?new=category">
                <Plus className="h-4 w-4" />
                <span>Create Documentation Category</span>
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" asChild>
              <a href="/platform/resource-center/documentation?new=article">
                <Plus className="h-4 w-4" />
                <span>Write Documentation Article</span>
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" asChild>
              <a href="/platform/resource-center/blog?new=video">
                <Plus className="h-4 w-4" />
                <span>Add Blog Video</span>
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" asChild>
              <a href="/platform/resource-center/blog?new=article">
                <Plus className="h-4 w-4" />
                <span>Write Blog Article</span>
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3" asChild>
              <a href="/platform/resource-center/changelog?new=release">
                <Plus className="h-4 w-4" />
                <span>Create Changelog Release</span>
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-violet-100 bg-white/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Resource Center Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Public Access</span>
              <StatusBadge variant="success">Enabled</StatusBadge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Search Indexing</span>
              <StatusBadge variant="success">Active</StatusBadge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Feedback Collection</span>
              <StatusBadge variant="success">Enabled</StatusBadge>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

interface DocCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  display_order: number;
  parent_id: string | null;
  is_published: boolean;
  articles: number;
}

interface DocArticle {
  id: string;
  title: string;
  slug: string;
  category_id: string;
  content: string;
  excerpt: string;
  cover_image_path: string | null;
  is_published: boolean;
  published_at: string;
  updated: string;
}

function DocumentationManagement() {
  const [activeView, setActiveView] = useState<'list' | 'category-form' | 'article-form'>('list');
  const [editingItem, setEditingItem] = useState<{ type: 'category' | 'article'; data: DocCategory | DocArticle } | null>(null);
  const [categories] = useState<DocCategory[]>([
    { id: '1', name: 'Getting Started', slug: 'getting-started', description: '', display_order: 0, parent_id: null, is_published: true, articles: 3 },
    { id: '2', name: 'Storefront Setup', slug: 'storefront-setup', description: '', display_order: 1, parent_id: null, is_published: true, articles: 4 },
    { id: '3', name: 'Product Management', slug: 'product-management', description: '', display_order: 2, parent_id: null, is_published: false, articles: 2 },
  ]);
  const [articles] = useState<DocArticle[]>([
    { id: '1', title: 'Create Your Store', slug: 'create-your-store', category_id: '1', content: '', excerpt: '', cover_image_path: null, is_published: true, published_at: '2026-01-15', updated: '2 hours ago' },
    { id: '2', title: 'Dashboard Overview', slug: 'dashboard-overview', category_id: '1', content: '', excerpt: '', cover_image_path: null, is_published: true, published_at: '2026-01-14', updated: '1 day ago' },
    { id: '3', title: 'Hero Section Setup', slug: 'hero-section-setup', category_id: '2', content: '', excerpt: '', cover_image_path: null, is_published: true, published_at: '2026-01-13', updated: '3 days ago' },
  ]);

  const handleNewCategory = useCallback(() => {
    setEditingItem({ type: 'category', data: { id: '', name: '', slug: '', description: '', display_order: 0, parent_id: null, is_published: true, articles: 0 } });
    setActiveView('category-form');
  }, []);

  const handleNewArticle = useCallback(() => {
    setEditingItem({ type: 'article', data: { id: '', title: '', slug: '', category_id: '', content: '', excerpt: '', cover_image_path: null, is_published: false, published_at: '', updated: '' } });
    setActiveView('article-form');
  }, []);

  const handleEditCategory = useCallback((cat: DocCategory) => {
    setEditingItem({ type: 'category', data: { ...cat } });
    setActiveView('category-form');
  }, []);

  const handleEditArticle = useCallback((article: DocArticle) => {
    setEditingItem({ type: 'article', data: { ...article } });
    setActiveView('article-form');
  }, []);

  const handleSaveCategory = useCallback(async (data: DocCategory) => {
    try {
      const url = data.id ? `/api/resource-center/documentation/categories/${data.id}` : '/api/resource-center/documentation/categories';
      const method = data.id ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save category');
      toast.success(data.id ? 'Category updated' : 'Category created');
      setActiveView('list');
      setEditingItem(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save category');
    }
  }, []);

  const handleSaveArticle = useCallback(async (data: DocArticle) => {
    try {
      const url = data.id ? `/api/resource-center/documentation/articles/${data.id}` : '/api/resource-center/documentation/articles';
      const method = data.id ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save article');
      toast.success(data.id ? 'Article updated' : 'Article created');
      setActiveView('list');
      setEditingItem(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save article');
    }
  }, []);

  const handleCancel = useCallback(() => {
    setActiveView('list');
    setEditingItem(null);
  }, []);

  if (activeView === 'category-form') {
    return (
      <CategoryForm
        initialData={editingItem?.data as DocCategory}
        categories={categories}
        onSave={handleSaveCategory}
        onCancel={handleCancel}
      />
    );
  }

  if (activeView === 'article-form') {
    return (
      <ArticleForm
        initialData={editingItem?.data as DocArticle}
        categories={categories}
        onSave={handleSaveArticle}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Documentation</h2>
          <p className="text-sm text-slate-500">Manage categories and articles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleNewCategory}>
            <Plus className="h-4 w-4 mr-2" />
            New Category
          </Button>
          <Button onClick={handleNewArticle}>
            <Plus className="h-4 w-4 mr-2" />
            New Article
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-violet-100 bg-white/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900">Categories</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Search categories..." className="h-9 w-64 pl-10 pr-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-violet-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{cat.name}</p>
                      <p className="text-xs text-slate-500">{cat.slug} • {cat.articles} articles</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={cat.is_published ? 'success' : 'neutral'}>
                      {cat.is_published ? 'Published' : 'Draft'}
                    </StatusBadge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditCategory(cat)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-violet-100 bg-white/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900">Articles</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Search articles..." className="h-9 w-64 pl-10 pr-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-violet-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 truncate max-w-[300px]">{article.title}</p>
                      <p className="text-xs text-slate-500">{categories.find(c => c.id === article.category_id)?.name || 'Unknown'} • {article.updated}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={article.is_published ? 'success' : 'neutral'}>
                      {article.is_published ? 'Published' : 'Draft'}
                    </StatusBadge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditArticle(article)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CategoryForm({
  initialData,
  categories,
  onSave,
  onCancel,
}: {
  initialData?: DocCategory;
  categories: DocCategory[];
  onSave: (data: DocCategory) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    id: initialData?.id || '',
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    display_order: initialData?.display_order || 0,
    parent_id: initialData?.parent_id || '',
    is_published: initialData?.is_published ?? true,
    articles: initialData?.articles || 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const parentOptions = [
    { value: '', label: 'None (Top-level)' },
    ...categories.map(c => ({ value: c.id, label: c.name })),
  ];

  return (
    <Card className="border-violet-100 bg-white/80 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              {initialData?.id ? 'Edit Category' : 'New Category'}
            </CardTitle>
            <CardDescription>Fill in the category details below.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Getting Started"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="getting-started"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this category"
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent_id">Parent Category</Label>
              <Select value={formData.parent_id} onValueChange={(value) => setFormData({ ...formData, parent_id: value })} >
                <SelectTrigger>
                  <SelectValue placeholder="None (Top-level)" />
                </SelectTrigger>
                <SelectContent>
                  {parentOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="is_published">Status</Label>
              <Select value={formData.is_published.toString()} onValueChange={(value) => setFormData({ ...formData, is_published: value === 'true' })} >
                <SelectTrigger>
                  <SelectValue placeholder="Published" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Published</SelectItem>
                  <SelectItem value="false">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {initialData?.id ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ArticleForm({
  initialData,
  categories,
  onSave,
  onCancel,
}: {
  initialData?: DocArticle;
  categories: DocCategory[];
  onSave: (data: DocArticle) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    id: initialData?.id || '',
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    category_id: initialData?.category_id || '',
    content: initialData?.content || '',
    excerpt: initialData?.excerpt || '',
    cover_image_path: initialData?.cover_image_path || null,
    is_published: initialData?.is_published ?? false,
    published_at: initialData?.published_at || '',
    updated: initialData?.updated || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-violet-100 bg-white/80 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              {initialData?.id ? 'Edit Article' : 'New Article'}
            </CardTitle>
            <CardDescription>Write and configure your documentation article.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="How to Set Up Your Storefront"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="how-to-set-up-your-storefront"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">Category *</Label>
            <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })} >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="excerpt">Excerpt</Label>
          <textarea
            id="excerpt"
            value={formData.excerpt}
            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            placeholder="Short summary for article listings"
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        <ResourceCenterImageUpload
          value={formData.cover_image_path}
          onChange={(path) => setFormData({ ...formData, cover_image_path: path })}
          assetType="documentation/cover"
          contentId={formData.id || 'new'}
          label="Cover Image"
          required={false}
        />

        <div className="space-y-2">
          <Label htmlFor="content">Content *</Label>
          <textarea
            id="content"
            value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write your article content here (Markdown supported)"
              rows={15}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="is_published">Status</Label>
            <Select value={formData.is_published.toString()} onValueChange={(value) => setFormData({ ...formData, is_published: value === 'true' })} >
              <SelectTrigger>
                <SelectValue placeholder="Draft" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Published</SelectItem>
                <SelectItem value="false">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {initialData?.id ? 'Update Article' : 'Create Article'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface BlogVideo {
  id: string;
  title: string;
  slug: string;
  category: string;
  category_id: string;
  platform: 'youtube' | 'facebook';
  video_url: string;
  thumbnail_path: string | null;
  description: string;
  is_published: boolean;
  updated: string;
}

interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  category_id: string;
  author: string;
  content: string;
  excerpt: string;
  cover_image_path: string | null;
  is_published: boolean;
  updated: string;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  display_order: number;
  contentCount: number;
  is_published: boolean;
}

type BlogItem = BlogVideo | BlogArticle | BlogCategory;

function BlogManagement() {
  const [activeTab, setActiveTab] = useState<'videos' | 'articles' | 'categories'>('videos');
  const [activeView, setActiveView] = useState<'list' | 'video-form' | 'article-form' | 'category-form'>('list');
  const [editingItem, setEditingItem] = useState<{ type: 'video' | 'article' | 'category'; data: BlogItem } | null>(null);

  const videos: BlogVideo[] = [
    { id: '1', title: 'Storefy Dashboard Tour', slug: 'storefy-dashboard-tour', category: 'Tutorials', category_id: '1', platform: 'youtube', video_url: 'https://youtube.com/watch?v=example', thumbnail_path: null, description: '', is_published: true, updated: '1 week ago' },
    { id: '2', title: 'Setting Up Your Storefront', slug: 'setting-up-storefront', category: 'Tutorials', category_id: '1', platform: 'youtube', video_url: 'https://youtube.com/watch?v=example2', thumbnail_path: null, description: '', is_published: true, updated: '2 weeks ago' },
    { id: '3', title: 'Product Management Basics', slug: 'product-management-basics', category: 'Tutorials', category_id: '1', platform: 'facebook', video_url: 'https://facebook.com/watch?v=example3', thumbnail_path: null, description: '', is_published: false, updated: '3 days ago' },
  ];

  const articles: BlogArticle[] = [
    { id: '1', title: 'How to Manage Your Online Store', slug: 'manage-online-store', category: 'Guides', category_id: '2', author: 'Storefy Team', content: '', excerpt: '', cover_image_path: null, is_published: true, updated: '3 days ago' },
    { id: '2', title: 'Organizing Your Product Catalog', slug: 'organizing-product-catalog', category: 'Guides', category_id: '2', author: 'Storefy Team', content: '', excerpt: '', cover_image_path: null, is_published: true, updated: '1 week ago' },
  ];

  const categories: BlogCategory[] = [
    { id: '1', name: 'Tutorials', slug: 'tutorials', description: '', display_order: 0, contentCount: 3, is_published: true },
    { id: '2', name: 'Guides', slug: 'guides', description: '', display_order: 1, contentCount: 2, is_published: true },
    { id: '3', name: 'Tips & Tricks', slug: 'tips-tricks', description: '', display_order: 2, contentCount: 0, is_published: false },
  ];

  const handleNew = useCallback((type: 'video' | 'article' | 'category') => {
    let initialData: BlogItem;
    if (type === 'video') {
      initialData = { id: '', title: '', slug: '', category_id: '', platform: 'youtube', video_url: '', description: '', thumbnail_path: null, is_published: false, updated: '', category: '' } as BlogVideo;
    } else if (type === 'article') {
      initialData = { id: '', title: '', slug: '', category_id: '', author: 'Storefy Team', content: '', excerpt: '', cover_image_path: null, is_published: false, updated: '', category: '' } as BlogArticle;
    } else {
      initialData = { id: '', name: '', slug: '', description: '', display_order: 0, is_published: true, contentCount: 0 } as BlogCategory;
    }
    setEditingItem({ type, data: initialData });
    setActiveView(`${type}-form`);
  }, []);

  const handleEdit = useCallback((type: 'video' | 'article' | 'category', data: BlogItem) => {
    setEditingItem({ type, data: { ...data } });
    setActiveView(`${type}-form`);
  }, []);

  const handleCancel = useCallback(() => {
    setActiveView('list');
    setEditingItem(null);
  }, []);

  if (activeView === 'video-form') {
    return (
      <VideoForm
        initialData={editingItem?.data as BlogVideo}
        categories={categories}
        onSave={async (data) => { toast.success(data.id ? 'Video updated' : 'Video created'); setActiveView('list'); setEditingItem(null); }}
        onCancel={handleCancel}
      />
    );
  }

  if (activeView === 'article-form') {
    return (
      <BlogArticleForm
        initialData={editingItem?.data as BlogArticle}
        categories={categories}
        onSave={async (data) => { toast.success(data.id ? 'Article updated' : 'Article created'); setActiveView('list'); setEditingItem(null); }}
        onCancel={handleCancel}
      />
    );
  }

  if (activeView === 'category-form') {
    return (
      <BlogCategoryForm
        initialData={editingItem?.data as BlogCategory}
        onSave={async (data) => { toast.success(data.id ? 'Category updated' : 'Category created'); setActiveView('list'); setEditingItem(null); }}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Blog</h2>
          <p className="text-sm text-slate-500">Manage videos, articles, and categories</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleNew('video')}>
            <Plus className="h-4 w-4 mr-2" />
            New Video
          </Button>
          <Button onClick={() => handleNew('article')}>
            <Plus className="h-4 w-4 mr-2" />
            New Article
          </Button>
        </div>
      </div>

      <div className="flex border-b border-violet-100" role="tablist">
        {[
          { id: 'videos', label: 'Videos', icon: Video },
          { id: 'articles', label: 'Articles', icon: Newspaper },
          { id: 'categories', label: 'Categories', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => { setActiveTab(tab.id as typeof activeTab); setActiveView('list'); }}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-violet-200'
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <Card className="border-violet-100 bg-white/80 shadow-sm">
        <CardContent className="pt-0">
          {activeTab === 'videos' && (
            <div className="space-y-2 p-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-violet-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg',
                      video.platform === 'youtube' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    )}>
                      <Video className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{video.title}</p>
                      <p className="text-xs text-slate-500">{video.category} • {video.updated}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={video.is_published ? 'success' : 'neutral'}>
                      {video.is_published ? 'Published' : 'Draft'}
                    </StatusBadge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit('video', video)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'articles' && (
            <div className="space-y-2 p-4">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-violet-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <Newspaper className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{article.title}</p>
                      <p className="text-xs text-slate-500">{article.category} • by {article.author} • {article.updated}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={article.is_published ? 'success' : 'neutral'}>
                      {article.is_published ? 'Published' : 'Draft'}
                    </StatusBadge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit('article', article)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-2 p-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-violet-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                      <Settings className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{cat.name}</p>
                      <p className="text-xs text-slate-500">{cat.slug} • {cat.contentCount} items</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={cat.is_published ? 'success' : 'neutral'}>
                      {cat.is_published ? 'Published' : 'Draft'}
                    </StatusBadge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit('category', cat)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VideoForm({
  initialData,
  categories,
  onSave,
  onCancel,
}: {
  initialData?: BlogVideo;
  categories: BlogCategory[];
  onSave: (data: BlogVideo) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<{
    id: string;
    title: string;
    slug: string;
    category_id: string;
    category: string;
    platform: 'youtube' | 'facebook';
    video_url: string;
    description: string;
    thumbnail_path: string | null;
    is_published: boolean;
    updated: string;
  }>({
    id: initialData?.id || '',
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    category_id: initialData?.category_id || '',
    category: initialData?.category || '',
    platform: (initialData?.platform as 'youtube' | 'facebook') || 'youtube',
    video_url: initialData?.video_url || '',
    description: initialData?.description || '',
    thumbnail_path: initialData?.thumbnail_path || null,
    is_published: initialData?.is_published ?? false,
    updated: initialData?.updated || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-violet-100 bg-white/80 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              {initialData?.id ? 'Edit Video' : 'New Video'}
            </CardTitle>
            <CardDescription>Add a tutorial video from YouTube or Facebook.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Storefy Dashboard Tour"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="storefy-dashboard-tour"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category_id">Category *</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })} >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform">Platform *</Label>
              <Select value={formData.platform} onValueChange={(value: 'youtube' | 'facebook') => setFormData({ ...formData, platform: value })} >
                <SelectTrigger>
                  <SelectValue placeholder="YouTube" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video_url">Video URL *</Label>
            <Input
              id="video_url"
              value={formData.video_url}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              placeholder="https://youtube.com/watch?v=... or https://facebook.com/watch?v=..."
              required
            />
          </div>

<div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this category"
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <ResourceCenterImageUpload
            value={formData.thumbnail_path}
            onChange={(path) => setFormData({ ...formData, thumbnail_path: path })}
            assetType="blog/videos/thumbnail"
            contentId={formData.id || 'new'}
            label="Thumbnail Image *"
            required={true}
          />

          <div className="space-y-2">
            <Label htmlFor="is_published">Status</Label>
            <Select value={formData.is_published.toString()} onValueChange={(value) => setFormData({ ...formData, is_published: value === 'true' })} >
              <SelectTrigger>
                <SelectValue placeholder="Draft" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Published</SelectItem>
                <SelectItem value="false">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {initialData?.id ? 'Update Video' : 'Create Video'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function BlogArticleForm({
  initialData,
  categories,
  onSave,
  onCancel,
}: {
  initialData?: BlogArticle;
  categories: BlogCategory[];
  onSave: (data: BlogArticle) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    id: initialData?.id || '',
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    category_id: initialData?.category_id || '',
    category: initialData?.category || '',
    author: initialData?.author || 'Storefy Team',
    content: initialData?.content || '',
    excerpt: initialData?.excerpt || '',
    cover_image_path: initialData?.cover_image_path || null,
    is_published: initialData?.is_published ?? false,
    updated: initialData?.updated || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-violet-100 bg-white/80 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              {initialData?.id ? 'Edit Article' : 'New Article'}
            </CardTitle>
            <CardDescription>Write and configure your blog article.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="How to Manage Your Online Store"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="how-to-manage-your-online-store"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="category_id">Category *</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })} >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="Storefy Team"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="is_published">Status</Label>
              <Select value={formData.is_published.toString()} onValueChange={(value) => setFormData({ ...formData, is_published: value === 'true' })} >
                <SelectTrigger>
                  <SelectValue placeholder="Draft" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Published</SelectItem>
                  <SelectItem value="false">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              placeholder="Short summary for article listings"
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <ResourceCenterImageUpload
            value={formData.cover_image_path}
            onChange={(path) => setFormData({ ...formData, cover_image_path: path })}
            assetType="blog/articles/cover"
            contentId={formData.id || 'new'}
            label="Cover Image"
            required={false}
          />

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write your article content here (Markdown supported)"
              rows={15}
              required
              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {initialData?.id ? 'Update Article' : 'Create Article'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function BlogCategoryForm({
  initialData,
  onSave,
  onCancel,
}: {
  initialData?: BlogCategory;
  onSave: (data: BlogCategory) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    id: initialData?.id || '',
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    display_order: initialData?.display_order || 0,
    is_published: initialData?.is_published ?? true,
    contentCount: initialData?.contentCount || 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-violet-100 bg-white/80 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              {initialData?.id ? 'Edit Category' : 'New Category'}
            </CardTitle>
            <CardDescription>Configure a blog category.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Tutorials"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="tutorials"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this category"
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="is_published">Status</Label>
              <Select value={formData.is_published.toString()} onValueChange={(value) => setFormData({ ...formData, is_published: value === 'true' })} >
                <SelectTrigger>
                  <SelectValue placeholder="Published" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Published</SelectItem>
                  <SelectItem value="false">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {initialData?.id ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ChangelogManagement() {
  const [activeView, setActiveView] = useState<'list' | 'release-form'>('list');
  const [editingRelease, setEditingRelease] = useState<ChangelogRelease | undefined>(undefined);

  const releases: ChangelogRelease[] = [
    { id: '1', version: 'v1.8.0', release_date: '2026-01-15', summary: 'Major feature release', image_path: null, is_published: true, entries: 5 },
    { id: '2', version: 'v1.7.0', release_date: '2025-12-01', summary: 'Performance improvements', image_path: null, is_published: true, entries: 8 },
    { id: '3', version: 'v1.6.0', release_date: '2025-10-20', summary: 'Bug fixes and stability', image_path: null, is_published: true, entries: 3 },
  ];

  const handleNewRelease = useCallback(() => {
    setEditingRelease({ id: '', version: '', release_date: new Date().toISOString().split('T')[0], summary: '', image_path: null, is_published: false, entries: 0 });
    setActiveView('release-form');
  }, []);

  const handleEditRelease = useCallback((release: ChangelogRelease) => {
    setEditingRelease({ ...release });
    setActiveView('release-form');
  }, []);

  const handleCancel = useCallback(() => {
    setActiveView('list');
    setEditingRelease(undefined);
  }, []);

  if (activeView === 'release-form') {
    return (
      <ReleaseForm
        initialData={editingRelease}
        onSave={async (data) => { toast.success(data.id ? 'Release updated' : 'Release created'); setActiveView('list'); setEditingRelease(undefined); }}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Changelog</h2>
          <p className="text-sm text-slate-500">Manage releases and entries</p>
        </div>
        <Button onClick={handleNewRelease}>
          <Plus className="h-4 w-4 mr-2" />
          New Release
        </Button>
      </div>

      <Card className="border-violet-100 bg-white/80 shadow-sm">
        <CardContent className="pt-0">
          <div className="space-y-1">
            {releases.map((release) => (
              <div
                key={release.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-violet-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                    <GitPullRequest className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-slate-900">{release.version}</span>
                      <StatusBadge variant={release.is_published ? 'success' : 'neutral'}>
                        {release.is_published ? 'Published' : 'Draft'}
                      </StatusBadge>
                    </div>
                    <p className="text-sm text-slate-500">
                      {new Date(release.release_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      • {release.entries} entries
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditRelease(release)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ChangelogRelease {
  id: string;
  version: string;
  release_date: string;
  summary: string | null;
  image_path: string | null;
  is_published: boolean;
  entries: number;
}

function ReleaseForm({
  initialData,
  onSave,
  onCancel,
}: {
  initialData?: ChangelogRelease;
  onSave: (data: ChangelogRelease) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    id: initialData?.id || '',
    version: initialData?.version || '',
    release_date: initialData?.release_date || new Date().toISOString().split('T')[0],
    summary: initialData?.summary || '',
    image_path: initialData?.image_path || null,
    is_published: initialData?.is_published ?? false,
    entries: initialData?.entries || 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-violet-100 bg-white/80 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              {initialData?.id ? 'Edit Release' : 'New Release'}
            </CardTitle>
            <CardDescription>Create a new changelog release with version and details.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="version">Version *</Label>
              <Input
                id="version"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="v1.9.0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="release_date">Release Date *</Label>
              <Input
                id="release_date"
                type="date"
                value={formData.release_date}
                onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Brief summary of this release"
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <ResourceCenterImageUpload
            value={formData.image_path}
            onChange={(path) => setFormData({ ...formData, image_path: path })}
            assetType="changelog/release"
            contentId={formData.id || 'new'}
            label="Release Image"
            required={false}
          />

          <div className="space-y-2">
            <Label htmlFor="is_published">Status</Label>
            <Select value={formData.is_published.toString()} onValueChange={(value) => setFormData({ ...formData, is_published: value === 'true' })} >
              <SelectTrigger>
                <SelectValue placeholder="Draft" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Published</SelectItem>
                <SelectItem value="false">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {initialData?.id ? 'Update Release' : 'Create Release'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}