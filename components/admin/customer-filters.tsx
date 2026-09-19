'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'blocked', label: 'Blocked' },
];

const SORT_OPTIONS = [
  { value: 'created_at-desc', label: 'Newest first' },
  { value: 'created_at-asc', label: 'Oldest first' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'phone-asc', label: 'Phone A-Z' },
  { value: 'updated_at-desc', label: 'Recently updated' },
];

const PAGE_SIZE_OPTIONS = [
  { value: '15', label: '15 per page' },
  { value: '30', label: '30 per page' },
  { value: '45', label: '45 per page' },
  { value: '60', label: '60 per page' },
];

const DEBOUNCE_MS = 350;

export function CustomerFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? 'all';
  const sortBy = searchParams.get('sort_by') ?? 'created_at';
  const sortOrder = searchParams.get('sort_order') ?? 'desc';
  const pageSize = searchParams.get('page_size') ?? '15';

  const hasFilters = search || status !== 'all';

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <DebouncedSearchInput
            defaultValue={search}
            onDebouncedChange={(value) => updateParam('search', value)}
          />
        </div>

        <select
          value={status}
          onChange={(e) => updateParam('status', e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent lg:w-auto"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
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
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent lg:w-auto"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          value={pageSize}
          onChange={(e) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set('page_size', e.target.value);
            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`);
          }}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent lg:w-auto"
        >
          {PAGE_SIZE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-10 px-3 text-sm lg:w-auto w-full justify-start"
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
      placeholder="Search customers by name, email, or phone..."
      value={value}
      onChange={handleChange}
      className="h-10 pl-10 pr-4"
    />
  );
}
