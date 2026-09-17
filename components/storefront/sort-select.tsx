'use client';

import * as React from 'react';

interface SortSelectProps {
  currentSort: string;
  currentOrder: string;
  search?: string;
  categoryId?: string;
}

export function SortSelect({ currentSort, currentOrder, search, categoryId }: SortSelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [newSortBy, newSortOrder] = e.target.value.split('-');
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (categoryId) params.set('category_id', categoryId);
    params.set('sort_by', newSortBy);
    params.set('sort_order', newSortOrder);
    const qs = params.toString();
    window.location.assign(`.?${qs}`);
  };

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="sort" className="text-sm font-medium text-slate-700">
        Sort by
      </label>
      <select
        id="sort"
        defaultValue={`${currentSort}-${currentOrder}`}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        onChange={handleChange}
      >
        <option value="created_at-desc">Newest first</option>
        <option value="created_at-asc">Oldest first</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="name-asc">Name: A to Z</option>
        <option value="name-desc">Name: Z to A</option>
      </select>
    </div>
  );
}
