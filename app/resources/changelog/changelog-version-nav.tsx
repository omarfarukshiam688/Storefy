'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ChangelogReleaseWithEntries } from '@/lib/resource-center';

interface ChangelogVersionNavProps {
  releases: ChangelogReleaseWithEntries[];
}

export function ChangelogVersionNav({ releases }: ChangelogVersionNavProps) {
  const [activeVersion, setActiveVersion] = React.useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const versionRefs = React.useRef<Map<string, HTMLElement>>(new Map());
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            if (id && releases.some((r) => r.version === id)) {
              setActiveVersion(id);
            }
          }
        }
      },
      {
        rootMargin: '-100px 0px -66% 0px',
        threshold: 0,
      }
    );

    releases.forEach((release) => {
      const element = document.getElementById(release.version);
      if (element) {
        versionRefs.current.set(release.version, element);
        observerRef.current?.observe(element);
      }
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [releases]);

  const handleVersionClick = (version: string) => {
    const element = document.getElementById(version);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveVersion(version);
    }
    setIsMobileOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, version: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleVersionClick(version);
    }
  };

  return (
    <nav
      className="lg:sticky lg:top-24 lg:self-start lg:space-y-1 lg:overflow-y-auto lg:max-h-[calc(100vh-8rem)] lg:pr-4"
      aria-label="Changelog versions"
    >
      {/* Mobile version selector dropdown */}
      <div className="lg:hidden">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="w-full flex items-center justify-between gap-2 rounded-lg border border-violet-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-900 shadow-sm hover:bg-violet-50 transition-colors"
            aria-haspopup="listbox"
            aria-expanded={isMobileOpen}
            aria-label="Select changelog version"
          >
            <span className="truncate">
              {activeVersion
                ? releases.find(r => r.version === activeVersion)?.version ?? 'Select version'
                : 'Select version'}
            </span>
            {isMobileOpen ? <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />}
          </button>

          {isMobileOpen && (
            <div
              className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-violet-200 bg-white shadow-lg"
              role="listbox"
              aria-label="Changelog versions"
            >
              <ul className="py-1">
                {releases.map((release) => (
                  <li key={release.version}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={activeVersion === release.version}
                      onClick={() => handleVersionClick(release.version)}
                      onKeyDown={(e) => handleKeyDown(e, release.version)}
                      className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-sm transition-colors ${
                        activeVersion === release.version
                          ? 'bg-violet-100 text-violet-700'
                          : 'text-slate-600 hover:bg-violet-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="font-medium truncate">{release.version}</span>
                      <span className="text-xs text-slate-400 shrink-0">
                        {formatDistanceToNow(new Date(release.release_date), { addSuffix: true })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Desktop version navigation */}
      <div className="hidden lg:block">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">ON THIS PAGE</h3>
        <ul className="space-y-1">
          {releases.map((release) => (
            <li key={release.version}>
              <a
                href={`#${release.version}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleVersionClick(release.version);
                }}
                className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
                  activeVersion === release.version
                    ? 'bg-violet-100 text-violet-700'
                    : 'text-slate-600 hover:bg-violet-50 hover:text-slate-900'
                }`}
              >
                <span className="font-medium truncate">{release.version}</span>
                <span className="text-xs text-slate-400">
                  {formatDistanceToNow(new Date(release.release_date), { addSuffix: true })}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}