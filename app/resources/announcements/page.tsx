import { Metadata } from 'next';
import { listAnnouncements } from '@/lib/announcements';
import { ResourceCenterTabs } from '../resource-center-tabs';
import { AnnouncementCard } from './announcement-card';

export const metadata: Metadata = {
  title: 'Announcements',
  description: 'Stay updated with the latest Storefy announcements.',
};

export default async function AnnouncementsPage() {
  const announcements = await listAnnouncements({
    is_published: true,
    sort_by: 'published_at',
    sort_order: 'desc',
  });

  return (
    <div className="min-h-screen bg-atmosphere-gradient">
      <header className="sticky top-0 z-40 border-b backdrop-blur-xl bg-white/80 border-violet-100/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center" aria-label="Storefy">
              <svg className="h-8 w-8 text-violet-700" viewBox="0 0 32 32" fill="currentColor">
                <path d="M16 2L4 8v16l12 6 12-6V8L16 2zm0 2.5L25.5 9 16 13.5 6.5 9 16 5.5zM6 10.5l9 4.5v11l-9-4.5V10.5zm10 15v-11l9-4.5v11l-9 4.5z"/>
              </svg>
            </a>
            <span className="hidden sm:block text-sm font-semibold text-slate-600">Resources</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ResourceCenterTabs />

        <div className="space-y-6">
          <header>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">Announcements</p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.05em] text-slate-950">Latest Updates</h1>
            <p className="mt-2 text-lg leading-7 text-slate-600">
              Stay informed about new features, improvements, and important updates from the Storefy team.
            </p>
          </header>

          {announcements.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-full max-w-md rounded-2xl border border-violet-100 bg-white/80 p-8 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">No announcements yet</h3>
                <p className="mt-2 text-sm text-slate-500">When there are updates, you&apos;ll see them here.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {announcements.map((announcement) => (
                <AnnouncementCard key={announcement.id} announcement={announcement} />
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="bg-[#6333EA] px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:pr-8">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden bg-transparent">
                  <svg className="h-full w-full text-white" viewBox="0 0 32 32" fill="currentColor">
                    <path d="M16 2L4 8v16l12 6 12-6V8L16 2zm0 2.5L25.5 9 16 13.5 6.5 9 16 5.5zM6 10.5l9 4.5v11l-9-4.5V10.5zm10 15v-11l9-4.5v11l-9 4.5z"/>
                  </svg>
                </div>
                <span className="text-xl font-semibold tracking-[-0.04em] text-white">Storefy</span>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-6 text-violet-100">
                Storefy helps small businesses turn Facebook-based selling into a professional online store.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-100">Quick Links</p>
              <ul className="mt-4 space-y-3 text-sm text-violet-50">
                <li><a href="/resources/documentation" className="transition-colors hover:text-white">Documentation</a></li>
                <li><a href="/resources/announcements" className="transition-colors hover:text-white">Announcements</a></li>
                <li><a href="/resources/blog" className="transition-colors hover:text-white">Blog</a></li>
                <li><a href="/resources/changelog" className="transition-colors hover:text-white">Changelog</a></li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-100">Get in Touch</p>
              <ul className="mt-4 space-y-4 text-sm text-violet-50">
                <li><a href="/auth/login" className="transition-colors hover:text-white">Contact via app</a></li>
                <li><a href="https://facebook.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-white">Facebook</a></li>
                <li><a href="/" className="transition-colors hover:text-white">Storefy website</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-white/20 pt-5 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-violet-100">© {new Date().getFullYear()} Storefy. All rights reserved.</p>
            <div className="flex items-center gap-3 text-violet-100">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Storefy on Facebook" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 transition-colors hover:bg-white/10 hover:text-white">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}