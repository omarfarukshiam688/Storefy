'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Megaphone, Video, GitPullRequest, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'documentation', label: 'Documentation', icon: BookOpen, href: '/resources/documentation' },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, href: '/resources/announcements' },
  { id: 'blog', label: 'Blog', icon: Video, href: '/resources/blog' },
  { id: 'changelog', label: 'Changelog', icon: GitPullRequest, href: '/resources/changelog' },
] as const;

export function ResourceCenterTabs() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/resources/documentation') {
      return pathname.startsWith('/resources/documentation');
    }
    if (href === '/resources/announcements') {
      return pathname.startsWith('/resources/announcements');
    }
    if (href === '/resources/blog') {
      return pathname.startsWith('/resources/blog');
    }
    if (href === '/resources/changelog') {
      return pathname.startsWith('/resources/changelog');
    }
    return false;
  };

  return (
    <nav aria-label="Resource Center sections" className="mb-8 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
              active
                ? 'bg-violet-100/80 text-violet-700 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.12)]'
                : 'text-slate-600 hover:bg-violet-50 hover:text-slate-900'
            )}
          >
            <tab.icon className="h-4 w-4" aria-hidden="true" />
            <span>{tab.label}</span>
            {active && <ChevronRight className="h-4 w-4 opacity-80" />}
          </Link>
        );
      })}
    </nav>
  );
}