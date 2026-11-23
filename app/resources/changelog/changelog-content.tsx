'use client';

import * as React from 'react';
import type { ChangelogReleaseWithEntries } from '@/lib/resource-center';

interface ChangelogContentProps {
  releases: ChangelogReleaseWithEntries[];
}

export function ChangelogContent({ releases }: ChangelogContentProps) {
  return (
    <div className="space-y-10">
      {releases.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700 mb-4">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No releases yet</h3>
          <p className="mt-2 text-sm text-slate-500">Release history will appear here once published.</p>
        </div>
      ) : (
        releases.map((release) => (
          <section key={release.id} id={release.version} className="space-y-6 scroll-section">
            <header className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                  {release.version}
                </span>
                <time className="text-sm text-slate-500" dateTime={release.release_date}>
                  {new Date(release.release_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </time>
              </div>
              {release.summary && (
                <p className="text-base leading-7 text-slate-600">{release.summary}</p>
              )}
            </header>

            {release.image_path && (
              <div className="rounded-xl overflow-hidden border border-violet-100">
                <img src={release.image_path} alt="" className="w-full h-auto" />
              </div>
            )}

            <div className="space-y-4">
              {renderEntryGroup(release.entries, 'feature', 'New Features', 'sparkles')}
              {renderEntryGroup(release.entries, 'improvement', 'Improvements', 'trending-up')}
              {renderEntryGroup(release.entries, 'bug_fix', 'Bug Fixes', 'bug')}
              {renderEntryGroup(release.entries, 'security', 'Security Updates', 'shield')}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function renderEntryGroup(
  entries: ChangelogReleaseWithEntries['entries'],
  type: ChangelogReleaseWithEntries['entries'][number]['type'],
  label: string,
  iconName: string
) {
  const filtered = entries.filter((e) => e.type === type);
  if (filtered.length === 0) return null;

  const icons: Record<string, React.ReactNode> = {
    'sparkles': <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L3 12l5.714-2.143L7 3z" /></svg>,
    'trending-up': <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
    'bug': <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M15 12a3 3 0 11-6 0 3 3 0 016 0zm3 0a3 3 0 11-6 0 3 3 0 016 0zm-9 8.25a2.25 2.25 0 012.25-2.25h4.5a2.25 2.25 0 012.25 2.25v2.25a2.25 2.25 0 01-2.25-2.25h-4.5a2.25 2.25 0 01-2.25-2.25v-2.25z" /></svg>,
    'shield': <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  };

  const colors: Record<string, string> = {
    'feature': 'text-emerald-700 bg-emerald-50 border-emerald-200',
    'improvement': 'text-sky-700 bg-sky-50 border-sky-200',
    'bug_fix': 'text-amber-700 bg-amber-50 border-amber-200',
    'security': 'text-red-700 bg-red-50 border-red-200',
  };

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg ${colors[type]}`}>
          {icons[iconName]}
        </span>
        {label}
      </h3>
      <ul className="space-y-2 ml-7 border-l border-violet-100 pl-4">
        {filtered.map((entry) => (
          <li key={entry.id} className="relative">
            <div className="absolute -left-4 top-1.5 h-2 w-2 rounded-full bg-violet-200" />
            <p className="text-sm text-slate-700">{entry.title}</p>
            {entry.description && (
              <p className="mt-1 text-sm text-slate-500">{entry.description}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}