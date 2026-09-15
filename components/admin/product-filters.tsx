'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import type { Category } from '@/types';

interface ProductFiltersProps {
  categories: Category[];
}

const DEBOUNCE_MS = 350;

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get('search') ?? '';
  const categoryId = searchParams.get('category_id') ?? '';
  const isActive = searchParams.get('is_active') ?? '';
  const isFeatured = searchParams.get('is_featured') ?? '';
  const sortBy = searchParams.get('sort_by') ?? 'created_at';
  const sortOrder = searchParams.get('sort_order') ?? 'desc';

  const hasFilters = search || categoryId || isActive || isFeatured;

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push(pathname);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <DebouncedSearchInput
            defaultValue={search}
            onDebouncedChange={(value) => updateParam('search', value)}
          />
        </div>

        <select
          value={categoryId}
          onChange={(e) => updateParam('category_id', e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={isActive}
          onChange={(e) => updateParam('is_active', e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent"
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>

        <select
          value={isFeatured}
          onChange={(e) => updateParam('is_featured', e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent"
        >
          <option value="">All products</option>
          <option value="true">Featured</option>
          <option value="false">Not featured</option>
        </select>

        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [by, order] = e.target.value.split('-');
            const params = new URLSearchParams(searchParams.toString());
            params.set('sort_by', by);
            params.set('sort_order', order);
            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`);
          }}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent"
        >
          <option value="created_at-desc">Newest</option>
          <option value="created_at-asc">Oldest</option>
          <option value="name-asc">Name A-Z</option>
          <option value="name-desc">Name Z-A</option>
          <option value="price-asc">Price low to high</option>
          <option value="price-desc">Price high to low</option>
          <option value="updated_at-desc">Recently updated</option>
          <option value="updated_at-asc">Least recently updated</option>
        </select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-10 px-3 text-sm"
          >
            <X className="h-4 w-4 mr-1.5" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

function DebouncedSearchInput({
  defaultValue,
  onDebouncedChange,
}: {
  defaultValue: string;
  onDebouncedChange: (value: string) => void;
}) {
  // Use defaultValue only for the initial mount. After that, the input is
  // locally controlled so typing is immediate. External URL changes (browser
  // back/forward) will not overwrite the in-progress search text; the data
  // fetch still uses the URL, so results stay correct.
  const [value, setValue] = React.useState(defaultValue);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      onDebouncedChange(next);
    }, DEBOUNCE_MS);
  };

  React.useLayoutEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <Input
      type="text"
      placeholder="Search products..."
      value={value}
      onChange={handleChange}
      className="h-10 pl-10 pr-4"
    />
  );
}
