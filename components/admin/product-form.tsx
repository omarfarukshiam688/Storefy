'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createProductSchema, updateProductSchema, type CreateProductInput } from '@/lib/validation/product';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Product, Category } from '@/types';

interface ProductFormProps {
  mode: 'create' | 'edit';
  initialData?: Product;
  categories: Category[];
  onSuccess?: (product: Product) => void;
}

export function ProductForm({ mode, initialData, categories, onSuccess }: ProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [formData, setFormData] = React.useState<CreateProductInput>({
    name: initialData?.name ?? '',
    slug: initialData?.slug ?? '',
    description: initialData?.description ?? null,
    short_description: initialData?.short_description ?? null,
    sku: initialData?.sku ?? null,
    price: initialData?.price ?? 0,
    compare_at_price: initialData?.compare_at_price ?? null,
    currency: initialData?.currency ?? 'USD',
    stock_status: initialData?.stock_status ?? 'in_stock',
    is_active: initialData?.is_active ?? true,
    is_featured: initialData?.is_featured ?? false,
    category_id: initialData?.category_id ?? null,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.currentTarget;
    setFormData((prev) => {
      if (name === 'price') {
        const numValue = value === '' ? 0 : parseFloat(value);
        return { ...prev, [name]: isNaN(numValue) ? 0 : numValue };
      }
      if (name === 'compare_at_price') {
        const numValue = value === '' ? null : parseFloat(value);
        return { ...prev, [name]: isNaN(numValue ?? 0) ? null : numValue };
      }
      if (name === 'is_active' || name === 'is_featured') {
        return { ...prev, [name]: value === 'true' };
      }
      if (name === 'category_id') {
        return { ...prev, [name]: value === '' ? null : value };
      }
      return { ...prev, [name]: value };
    });
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

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const schema = mode === 'create' ? createProductSchema : updateProductSchema;
      const validated = schema.safeParse(formData);

      if (!validated.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of validated.error.issues) {
          fieldErrors[issue.path[0] as string] = issue.message;
        }
        setErrors(fieldErrors);
        setIsSubmitting(false);
        return;
      }

      const url = mode === 'create'
        ? '/api/products'
        : `/api/products/${initialData?.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

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
          toast.error('Failed to save product');
        }
        setIsSubmitting(false);
        return;
      }

      const product = await response.json() as Product;
      toast.success(mode === 'create' ? 'Product created successfully!' : 'Product updated successfully!');
      onSuccess?.(product);

      if (mode === 'create') {
        router.push(`/dashboard/products/${product.id}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Basic Information */}
      <div className="space-y-5">
        <h3 className="text-base font-semibold">Basic information</h3>
        <div className="space-y-2.5">
          <Label htmlFor="name" className="text-sm font-semibold">Product name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            disabled={isSubmitting}
            className="h-11 px-4 text-base"
            placeholder="Enter product name"
          />
          {errors.name && (
            <p className="text-sm font-medium text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="slug" className="text-sm font-semibold">Slug</Label>
          <div className="flex gap-3">
            <Input
              id="slug"
              name="slug"
              type="text"
              value={formData.slug}
              onChange={handleChange}
              disabled={isSubmitting}
              className="h-11 px-4 text-base flex-1"
              placeholder="product-slug"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={autoGenerateSlug}
              disabled={isSubmitting}
              className="h-11 px-4"
            >
              Auto-generate
            </Button>
          </div>
          {errors.slug && (
            <p className="text-sm font-medium text-destructive">{errors.slug}</p>
          )}
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="short_description" className="text-sm font-semibold">Short description</Label>
          <Input
            id="short_description"
            name="short_description"
            type="text"
            value={formData.short_description ?? ''}
            onChange={handleChange}
            disabled={isSubmitting}
            className="h-11 px-4 text-base"
            placeholder="Brief summary (optional)"
          />
          {errors.short_description && (
            <p className="text-sm font-medium text-destructive">{errors.short_description}</p>
          )}
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
          <textarea
            id="description"
            name="description"
            value={formData.description ?? ''}
            onChange={handleChange}
            disabled={isSubmitting}
            rows={5}
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-base shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Detailed product description (optional)"
          />
          {errors.description && (
            <p className="text-sm font-medium text-destructive">{errors.description}</p>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-5">
        <h3 className="text-base font-semibold">Pricing</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2.5">
            <Label htmlFor="price" className="text-sm font-semibold">Price</Label>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={handleChange}
              disabled={isSubmitting}
              className="h-11 px-4 text-base"
              placeholder="0.00"
            />
            {errors.price && (
              <p className="text-sm font-medium text-destructive">{errors.price}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="compare_at_price" className="text-sm font-semibold">Compare-at price</Label>
            <Input
              id="compare_at_price"
              name="compare_at_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.compare_at_price ?? ''}
              onChange={handleChange}
              disabled={isSubmitting}
              className="h-11 px-4 text-base"
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">Original price for sale display (optional)</p>
            {errors.compare_at_price && (
              <p className="text-sm font-medium text-destructive">{errors.compare_at_price}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="currency" className="text-sm font-semibold">Currency</Label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              disabled={isSubmitting}
              className="h-11 w-full rounded-lg border border-input bg-background px-4 text-base shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="JPY">JPY - Japanese Yen</option>
              <option value="AUD">AUD - Australian Dollar</option>
              <option value="CAD">CAD - Canadian Dollar</option>
            </select>
            {errors.currency && (
              <p className="text-sm font-medium text-destructive">{errors.currency}</p>
            )}
          </div>
        </div>
      </div>

      {/* Inventory & Availability */}
      <div className="space-y-5">
        <h3 className="text-base font-semibold">Inventory & availability</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2.5">
            <Label htmlFor="sku" className="text-sm font-semibold">SKU</Label>
            <Input
              id="sku"
              name="sku"
              type="text"
              value={formData.sku ?? ''}
              onChange={handleChange}
              disabled={isSubmitting}
              className="h-11 px-4 text-base"
              placeholder="SKU-001 (optional)"
            />
            {errors.sku && (
              <p className="text-sm font-medium text-destructive">{errors.sku}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="stock_status" className="text-sm font-semibold">Stock status</Label>
            <select
              id="stock_status"
              name="stock_status"
              value={formData.stock_status}
              onChange={handleChange}
              disabled={isSubmitting}
              className="h-11 w-full rounded-lg border border-input bg-background px-4 text-base shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="in_stock">In stock</option>
              <option value="out_of_stock">Out of stock</option>
              <option value="preorder">Pre-order</option>
              <option value="backorder">Backorder</option>
            </select>
            {errors.stock_status && (
              <p className="text-sm font-medium text-destructive">{errors.stock_status}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <Label htmlFor="is_active" className="text-sm font-medium cursor-pointer">Active</Label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_featured"
              name="is_featured"
              checked={formData.is_featured}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_featured: e.target.checked }))}
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <Label htmlFor="is_featured" className="text-sm font-medium cursor-pointer">Featured</Label>
          </div>
        </div>
      </div>

      {/* Organization */}
      <div className="space-y-5">
        <h3 className="text-base font-semibold">Organization</h3>
        <div className="space-y-2.5">
          <Label htmlFor="category_id" className="text-sm font-semibold">Category</Label>
          <select
            id="category_id"
            name="category_id"
            value={formData.category_id ?? ''}
            onChange={handleChange}
            disabled={isSubmitting}
            className="h-11 w-full rounded-lg border border-input bg-background px-4 text-base shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.category_id && (
            <p className="text-sm font-medium text-destructive">{errors.category_id}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-6 border-t">
        <Button type="submit" disabled={isSubmitting} className="h-11 px-6">
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create product' : 'Save changes'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => router.back()}
          className="h-11 px-6"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
