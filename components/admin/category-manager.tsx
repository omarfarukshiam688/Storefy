'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createCategorySchema, updateCategorySchema } from '@/lib/validation/product';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import type { Category } from '@/types';

interface CategoryManagerProps {
  categories: Category[];
}

export function CategoryManager({ categories }: CategoryManagerProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({ name: '', slug: '', description: '' });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const resetForm = () => {
    setFormData({ name: '', slug: '', description: '' });
    setErrors({});
    setIsAdding(false);
    setEditingId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const schema = editingId ? updateCategorySchema : createCategorySchema;
      const payload = editingId
        ? { ...formData, description: formData.description || null }
        : { ...formData, description: formData.description || null, display_order: 0, is_active: true };
      const validated = schema.safeParse(payload);

      if (!validated.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of validated.error.issues) {
          fieldErrors[issue.path[0] as string] = issue.message;
        }
        setErrors(fieldErrors);
        setIsSubmitting(false);
        return;
      }

      const url = editingId ? `/api/categories/${editingId}` : '/api/categories';
      const method = editingId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated.data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        if (result.details) {
          const fieldErrors: Record<string, string> = {};
          for (const issue of result.details.issues) {
            fieldErrors[issue.path[0] as string] = issue.message;
          }
          setErrors(fieldErrors);
        } else if (result.error) {
          toast.error(result.error);
        } else {
          toast.error('Failed to save category');
        }
        setIsSubmitting(false);
        return;
      }

      toast.success(editingId ? 'Category updated' : 'Category created');
      resetForm();
      router.refresh();
    } catch (error) {
      console.error('Category save error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({ name: category.name, slug: category.slug, description: category.description ?? '' });
    setIsAdding(false);
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? Products in this category will become uncategorized.')) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${categoryId}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error(result.error ?? 'Failed to delete category');
        return;
      }
      toast.success('Category deleted');
      router.refresh();
    } catch (error) {
      console.error('Category delete error:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !category.is_active }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error(result.error ?? 'Failed to update category');
        return;
      }
      toast.success(category.is_active ? 'Category deactivated' : 'Category activated');
      router.refresh();
    } catch (error) {
      console.error('Category toggle error:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  const autoGenerateSlug = () => {
    if (!formData.name) return;
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 255);
    setFormData((prev) => ({ ...prev, slug }));
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Categories</h3>
          <p className="text-sm text-muted-foreground mt-1">Organize your products into categories.</p>
        </div>
        {!isAdding && !editingId && (
          <Button size="sm" onClick={() => setIsAdding(true)} className="h-10">
            Add category
          </Button>
        )}
      </div>

      {(isAdding || editingId) && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-lg border border-dashed border-border bg-muted/30 p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <Label htmlFor="cat-name" className="text-sm font-semibold">Name</Label>
              <Input
                id="cat-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                disabled={isSubmitting}
                className="h-10 px-3 text-sm"
                placeholder="Category name"
              />
              {errors.name && (
                <p className="text-xs font-medium text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="cat-slug" className="text-sm font-semibold">Slug</Label>
              <div className="flex gap-2">
                <Input
                  id="cat-slug"
                  name="slug"
                  type="text"
                  value={formData.slug}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="h-10 px-3 text-sm flex-1"
                  placeholder="category-slug"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={autoGenerateSlug}
                  disabled={isSubmitting}
                  className="h-10 px-3"
                >
                  Auto
                </Button>
              </div>
              {errors.slug && (
                <p className="text-xs font-medium text-destructive">{errors.slug}</p>
              )}
            </div>
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="cat-description" className="text-sm font-semibold">Description</Label>
            <Input
              id="cat-description"
              name="description"
              type="text"
              value={formData.description}
              onChange={handleChange}
              disabled={isSubmitting}
              className="h-10 px-3 text-sm"
              placeholder="Optional description"
            />
            {errors.description && (
              <p className="text-xs font-medium text-destructive">{errors.description}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting} size="sm" className="h-9">
              {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm} size="sm" className="h-9">
              Cancel
            </Button>
          </div>
        </form>
      )}

      {categories.length === 0 && !isAdding ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No categories yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first category to organize products.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                category.is_active ? 'border-border bg-background' : 'border-border bg-muted/30 opacity-70'
              }`}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{category.name}</span>
                <span className="text-xs text-muted-foreground font-mono">{category.slug}</span>
                {category.description && (
                  <span className="text-xs text-muted-foreground mt-0.5">{category.description}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(category)}
                  className="h-8 px-3 text-xs"
                >
                  {category.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(category)}
                  className="h-8 w-8"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(category.id)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
