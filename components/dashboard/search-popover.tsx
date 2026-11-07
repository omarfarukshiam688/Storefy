'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { SearchResultItem } from '@/types';

const typeLabels: Record<string, string> = {
  product: 'Products',
  order: 'Orders',
  customer: 'Customers',
  review: 'Reviews',
  team: 'Team',
  announcement: 'Announcements',
};

export function SearchPopover() {
  const [expanded, setExpanded] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const open = expanded && query.trim().length > 0;
  const [results, setResults] = React.useState<SearchResultItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) throw new Error('Search failed');
        const data = (await res.json()) as { results: SearchResultItem[] };
        setResults(data.results ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleOpenChange = React.useCallback((next: boolean) => {
    if (!next) {
      setExpanded(false);
      setQuery('');
      setResults([]);
      setError(null);
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (expanded) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [expanded]);

  const grouped = results.reduce<Record<string, SearchResultItem[]>>((acc, item) => {
    const group = typeLabels[item.type] || item.type;
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div className="flex items-center">
          {open ? (
            <div className="flex items-center gap-2 rounded-full border border-violet-100 bg-white/80 px-3 py-2 text-sm">
              <Search className="h-4 w-4 text-slate-400" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, orders..."
                className="h-6 w-48 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              />
              {query && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => setQuery('')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="hidden items-center gap-2 rounded-full border border-violet-100 bg-violet-50/60 px-3 py-2 text-sm text-slate-500 md:flex"
            >
              <Search className="h-4 w-4 text-violet-600" />
              <span>Search</span>
            </button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-2rem)] max-w-sm p-0"
        align="end"
        sideOffset={8}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <div className="max-h-[320px] overflow-y-auto p-1.5">
          {loading && (
            <div className="space-y-2 p-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-violet-50/60" />
              ))}
            </div>
          )}
          {error && (
            <div className="p-4 text-center text-sm text-destructive">{error}</div>
          )}
          {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm font-medium text-slate-900">No results found</p>
              <p className="mt-1 text-xs text-slate-500">Try a different search term.</p>
            </div>
          )}
          {!loading && !error && results.length > 0 && (
            <div className="space-y-1.5">
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group}>
                  <p className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {group}
                  </p>
                  {items.map((item) => (
                    <a
                      key={`${item.type}-${item.id}`}
                      href={item.href}
                      className="flex items-start gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-violet-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-slate-900">{item.title}</p>
                        <p className="truncate text-xs text-slate-500">{item.description}</p>
                      </div>
                      {item.meta && (
                        <span className="shrink-0 text-xs text-slate-500">{item.meta}</span>
                      )}
                    </a>
                  ))}
                </div>
              ))}
            </div>
          )}
          {!loading && !error && query.trim().length > 0 && query.trim().length < 2 && (
            <div className="p-6 text-center text-xs text-slate-500">
              Type at least 2 characters to search.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
