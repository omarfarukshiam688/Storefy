import { Metadata } from 'next';
import { getResourceCenterOverview } from '@/lib/resource-center';
import { ResourceCenterTabs } from '../resource-center-tabs';
import { BlogVideosTab } from './blog-videos-tab';
import { BlogArticlesTab } from './blog-articles-tab';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Learn from Storefy blog videos and articles.',
};

export default async function BlogPage() {
  const overview = await getResourceCenterOverview();

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

        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">Blog</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.05em] text-slate-950">Learn & Grow</h1>
          <p className="mt-2 text-lg leading-7 text-slate-600">
            Watch tutorial videos and read in-depth articles to master Storefy.
          </p>
        </header>

        <div className="border border-violet-100 rounded-xl overflow-hidden bg-white/80" role="tablist" aria-label="Blog sections">
          <div className="flex border-b border-violet-100 bg-violet-50/70" role="tablist">
            <button
              id="blog-videos-tab"
              role="tab"
              aria-selected="true"
              aria-controls="blog-videos-panel"
              className="flex-1 px-6 py-4 text-center text-sm font-semibold text-violet-700 border-b-2 border-violet-600 bg-white/50"
            >
              Videos
            </button>
            <button
              id="blog-articles-tab"
              role="tab"
              aria-selected="false"
              aria-controls="blog-articles-panel"
              className="flex-1 px-6 py-4 text-center text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              Articles
            </button>
          </div>

          <div id="blog-videos-panel" role="tabpanel" aria-labelledby="blog-videos-tab">
            <BlogVideosTab categories={overview.blogCategories} />
          </div>

          <div id="blog-articles-panel" role="tabpanel" aria-labelledby="blog-articles-tab" className="hidden">
            <BlogArticlesTab categories={overview.blogCategories} />
          </div>
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

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              const videosTab = document.getElementById('blog-videos-tab');
              const articlesTab = document.getElementById('blog-articles-tab');
              const videosPanel = document.getElementById('blog-videos-panel');
              const articlesPanel = document.getElementById('blog-articles-panel');

              function showVideos() {
                videosTab.className = 'flex-1 px-6 py-4 text-center text-sm font-semibold text-violet-700 border-b-2 border-violet-600 bg-white/50';
                videosTab.setAttribute('aria-selected', 'true');
                articlesTab.className = 'flex-1 px-6 py-4 text-center text-sm font-semibold text-slate-600 hover:text-slate-900';
                articlesTab.setAttribute('aria-selected', 'false');
                videosPanel.classList.remove('hidden');
                articlesPanel.classList.add('hidden');
              }

              function showArticles() {
                articlesTab.className = 'flex-1 px-6 py-4 text-center text-sm font-semibold text-violet-700 border-b-2 border-violet-600 bg-white/50';
                articlesTab.setAttribute('aria-selected', 'true');
                videosTab.className = 'flex-1 px-6 py-4 text-center text-sm font-semibold text-slate-600 hover:text-slate-900';
                videosTab.setAttribute('aria-selected', 'false');
                articlesPanel.classList.remove('hidden');
                videosPanel.classList.add('hidden');
              }

              videosTab.addEventListener('click', showVideos);
              articlesTab.addEventListener('click', showArticles);
            });
          `,
        }}
      />
    </div>
  );
}