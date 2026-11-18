'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  className?: string;
  tenantSlug?: string;
  placeholder?: string;
}

export function SearchBar({ className, tenantSlug, placeholder = 'Search products...' }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = React.useState(initialQuery);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set('q', value.trim());
      } else {
        params.delete('q');
      }
      if (tenantSlug && window.location.pathname === `/s/${tenantSlug}`) {
        if (value.trim()) {
          router.replace(`/s/${tenantSlug}/products?q=${encodeURIComponent(value.trim())}`, { scroll: false });
        }
        return;
      }
      const newUrl = value.trim() ? `?${params.toString()}` : window.location.pathname;
      router.replace(newUrl, { scroll: false });
    }, 300);
  };

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        className="h-11 rounded-full border-0 bg-slate-100 pl-10 pr-4 text-[13px] shadow-none md:h-11"
      />
    </div>
  );
}
