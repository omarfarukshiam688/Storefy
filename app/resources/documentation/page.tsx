import { Metadata } from 'next';
import { getResourceCenterOverview } from '@/lib/resource-center';
import { DocumentationSidebar } from './documentation-sidebar';
import { DocumentationContent } from './documentation-content';
import { ResourceCenterTabs } from '../resource-center-tabs';
import { Menu } from 'lucide-react';
import type { DocumentationCategoryWithArticles } from '@/lib/resource-center';
import * as React from 'react';

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'Browse Storefy documentation and guides.',
};

export default async function DocumentationPage() {
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

      <DocumentationPageClient categories={overview.documentationCategories} />
    </div>
  );
}

function DocumentationPageClient({ categories }: { categories: DocumentationCategoryWithArticles[] }) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-atmosphere-gradient">
      <header className="sticky top-0 z-40 border-b backdrop-blur-xl bg-white/80 border-violet-100/80 lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center" aria-label="Storefy">
              <svg className="h-8 w-8 text-violet-700" viewBox="0 0 32 32" fill="currentColor">
                <path d="M16 2L4 8v16l12 6 12-6V8L16 2zm0 2.5L25.5 9 16 13.5 6.5 9 16 5.5zM6 10.5l9 4.5v11l-9-4.5V10.5zm10 15v-11l9-4.5v11l-9 4.5z"/>
              </svg>
            </a>
            <span className="text-sm font-semibold text-slate-600">Resources</span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-2 rounded-lg text-slate-600 hover:bg-violet-50 hover:text-slate-900"
            aria-label="Open documentation navigation"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:gap-8">
        <DocumentationSidebar
          categories={categories}
          isMobileOpen={isMobileDrawerOpen}
          onCloseMobile={() => setIsMobileDrawerOpen(false)}
        />

        <main className="flex-1 min-w-0 lg:max-w-3xl">
          <ResourceCenterTabs />
          <DocumentationContent categories={categories} />
        </main>

        <aside className="hidden lg:block lg:w-48 lg:flex-shrink-0">
          <DocumentationTOC />
        </aside>
      </div>
    </div>
  );
}

function DocumentationTOC() {
  return (
    <nav
      className="sticky top-24 self-start space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)] pr-4"
      aria-label="On this page"
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">ON THIS PAGE</h3>
      <div id="toc-container" className="space-y-1 text-sm">
        <p className="text-slate-400">Select an article to see its headings here.</p>
      </div>
    </nav>
  );
}