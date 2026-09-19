'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';

interface CategoryNavProps {
  categories: Category[];
  tenantSlug: string;
}

export function CategoryNav({ categories, tenantSlug }: CategoryNavProps) {
  const searchParams = useSearchParams();
  const activeCategoryId = searchParams.get('category_id');

  if (categories.length === 0) {
    return null;
  }

  const basePath = `/s/${tenantSlug}`;

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={basePath}
        className={cn(
          'inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
          !activeCategoryId
            ? 'border-violet-200 bg-violet-50 text-violet-700'
            : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-slate-900'
        )}
      >
        All
      </Link>
      {categories.map((category) => {
        const isActive = activeCategoryId === category.id;
        return (
          <Link
            key={category.id}
            href={`${basePath}?category_id=${category.id}`}
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
              isActive
                ? 'border-violet-200 bg-violet-50 text-violet-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-slate-900'
            )}
          >
            {category.name}
          </Link>
        );
      })}
    </div>
  );
}
