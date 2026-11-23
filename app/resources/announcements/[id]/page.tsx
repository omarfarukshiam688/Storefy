import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAnnouncement } from '@/lib/announcements';
import { ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ResourceCenterTabs } from '../../resource-center-tabs';

interface AnnouncementDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AnnouncementDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const announcement = await getAnnouncement(id);
    if (announcement.is_published) {
      return {
        title: announcement.title,
        description: announcement.content.slice(0, 160),
      };
    }
  } catch {
    // Will 404 in the page
  }
  return { title: 'Announcement' };
}

export default async function AnnouncementDetailPage({ params }: AnnouncementDetailPageProps) {
  const { id } = await params;

  let announcement;
  try {
    announcement = await getAnnouncement(id);
  } catch {
    notFound();
  }

  if (!announcement.is_published) {
    notFound();
  }

  const displayDate = announcement.published_at
    ? formatDistanceToNow(new Date(announcement.published_at), { addSuffix: true })
    : formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true });

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

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <ResourceCenterTabs />

        <article className="space-y-6">
          <header className="space-y-4">
            <Link
              href="/resources/announcements"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-violet-700"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Announcements
            </Link>

            <div>
              <h1 className="text-3xl font-bold tracking-[-0.05em] text-slate-950">{announcement.title}</h1>
              <time className="mt-2 text-sm text-slate-500" dateTime={announcement.published_at ?? announcement.created_at}>
                Published {displayDate}
              </time>
            </div>
          </header>

          <div className="prose prose-slate max-w-none prose-a:text-violet-700 prose-a:no-underline hover:prose-a:underline">
            <div className="whitespace-pre-wrap text-base leading-7 text-slate-700">
              {announcement.content}
            </div>
          </div>
        </article>
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