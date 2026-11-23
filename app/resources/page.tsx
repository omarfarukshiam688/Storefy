import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Megaphone, Video, Newspaper, GitPullRequest, ChevronRight } from 'lucide-react';
import { getResourceCenterOverview } from '@/lib/resource-center';

export const metadata: Metadata = {
  title: 'Resource Center',
  description: 'Explore Storefy documentation, announcements, blog, and changelog.',
};

const tabs = [
  { id: 'documentation', label: 'Documentation', icon: BookOpen, href: '/resources/documentation' },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, href: '/resources/announcements' },
  { id: 'blog', label: 'Blog', icon: Video, href: '/resources/blog' },
  { id: 'changelog', label: 'Changelog', icon: GitPullRequest, href: '/resources/changelog' },
] as const;

export default async function ResourcesPage() {
  const overview = await getResourceCenterOverview();

  const docArticleCount = overview.documentationCategories.reduce(
    (sum, cat) => sum + cat.articles.length + cat.children.reduce((s, c) => s + c.articles.length, 0),
    0
  );

  const videoCount = overview.blogCategories.reduce((sum, cat) => sum + cat.videos.length, 0);
  const blogArticleCount = overview.blogCategories.reduce((sum, cat) => sum + cat.articles.length, 0);
  const releaseCount = overview.changelogReleases.length;

  const stats = [
    { label: 'Documentation Articles', value: docArticleCount, icon: BookOpen },
    { label: 'Announcements', value: 0, icon: Megaphone }, // Will be fetched separately
    { label: 'Blog Videos', value: videoCount, icon: Video },
    { label: 'Blog Articles', value: blogArticleCount, icon: Newspaper },
    { label: 'Releases', value: releaseCount, icon: GitPullRequest },
  ];

  return (
    <div className="min-h-screen bg-atmosphere-gradient">
      <header className="sticky top-0 z-40 border-b backdrop-blur-xl bg-white/80 border-violet-100/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center" aria-label="Storefy">
            <div className="relative h-10 w-[88px] overflow-hidden bg-transparent sm:h-12 sm:w-24">
              <Image
                src="/storefy-LOGO.png"
                alt="Storefy logo"
                width={180}
                height={90}
                className="h-full w-full object-contain"
                priority
              />
            </div>
          </Link>

          <nav aria-label="Resource Center tabs" className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-violet-50 hover:text-slate-900"
              >
                <tab.icon className="h-4 w-4" aria-hidden="true" />
                <span>{tab.label}</span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="hidden sm:block text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
            >
              Sign in
            </Link>
            <Link href="/auth/signup" className="hidden sm:block">
              <button className="rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-800">
                Start Free
              </button>
            </Link>
          </div>
        </div>

        <nav aria-label="Resource Center tabs (mobile)" className="md:hidden border-t border-violet-100/80">
          <div className="mx-auto flex max-w-7xl overflow-x-auto px-4 py-3">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className="shrink-0 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-violet-50 hover:text-slate-900 whitespace-nowrap"
              >
                <tab.icon className="h-4 w-4" aria-hidden="true" />
                <span>{tab.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">Resource Center</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-slate-950 sm:text-5xl">
            Everything you need to succeed with Storefy
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Browse documentation, stay updated with announcements, learn from our blog, and track platform changes.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={tabs.find((t) => t.label.toLowerCase().includes(stat.label.toLowerCase().split(' ')[0]))?.href ?? '/resources'}
              className="group rounded-2xl border border-violet-100 bg-white/80 p-6 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] backdrop-blur-sm transition-all duration-200 hover:border-violet-200 hover:shadow-[0_22px_55px_-35px_rgba(76,29,149,0.45)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-700 group-hover:bg-violet-100 transition-colors">
                  <stat.icon className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold tracking-tight text-slate-900">{stat.value.toLocaleString()}</p>
                <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-16">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">Documentation</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.05em] text-slate-900">Popular Guides</h2>
            </div>
            <Link
              href="/resources/documentation"
              className="flex items-center gap-1.5 text-sm font-semibold text-violet-700 hover:text-violet-800"
            >
              View all
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {overview.documentationCategories.slice(0, 3).map((category) => (
              <Link
                key={category.id}
                href={`/resources/documentation?category=${category.slug}`}
                className="group rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] backdrop-blur-sm transition-all duration-200 hover:border-violet-200 hover:shadow-[0_22px_55px_-35px_rgba(76,29,149,0.45)]"
              >
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-violet-700 transition-colors">
                  {category.name}
                </h3>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                  {category.description ?? `${category.articles.length} articles available`}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Browse articles
                  <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">Latest Updates</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.05em] text-slate-900">Recent Releases</h2>
            </div>
            <Link
              href="/resources/changelog"
              className="flex items-center gap-1.5 text-sm font-semibold text-violet-700 hover:text-violet-800"
            >
              View all
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {overview.changelogReleases.slice(0, 3).map((release) => (
              <Link
                key={release.id}
                href={`/resources/changelog#${release.version}`}
                className="group flex items-center gap-4 rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] backdrop-blur-sm transition-all duration-200 hover:border-violet-200 hover:shadow-[0_22px_55px_-35px_rgba(76,29,149,0.45)]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 group-hover:bg-violet-100 transition-colors">
                  <GitPullRequest className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{release.version}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(release.release_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 truncate">
                    {release.summary ?? `${release.entries.length} changes`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-violet-600 transition-colors" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-[32px] border border-violet-200 bg-gradient-to-br from-violet-700 via-violet-700 to-indigo-700 px-6 py-12 text-center text-white shadow-[0_30px_80px_-35px_rgba(79,70,229,0.45)] sm:px-8 lg:px-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-100">Need help?</p>
          <h2 className="mt-4 text-3xl font-bold tracking-[-0.05em] sm:text-4xl">
            Can&apos;t find what you&apos;re looking for?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-violet-50/90 sm:text-lg">
            Contact our support team or join the community to get answers to your questions.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/login"
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50"
            >
              Contact Support
            </Link>
            <Link
              href="/resources/documentation"
              className="rounded-xl border-2 border-white/30 bg-transparent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Browse Documentation
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#6333EA] px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:pr-8">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden bg-transparent">
                  <Image
                    src="/storefy-LOGO.png"
                    alt="Storefy logo"
                    fill
                    className="object-contain"
                    priority
                  />
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
                <li><Link href="/resources/documentation" className="transition-colors hover:text-white">Documentation</Link></li>
                <li><Link href="/resources/announcements" className="transition-colors hover:text-white">Announcements</Link></li>
                <li><Link href="/resources/blog" className="transition-colors hover:text-white">Blog</Link></li>
                <li><Link href="/resources/changelog" className="transition-colors hover:text-white">Changelog</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-100">Get in Touch</p>
              <ul className="mt-4 space-y-4 text-sm text-violet-50">
                <li><Link href="/auth/login" className="transition-colors hover:text-white">Contact via app</Link></li>
                <li><a href="https://facebook.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-white">Facebook</a></li>
                <li><Link href="/" className="transition-colors hover:text-white">Storefy website</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-white/20 pt-5 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-violet-100">© {new Date().getFullYear()} Storefy. All rights reserved.</p>
            <div className="flex items-center gap-3 text-violet-100">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Storefy on Facebook" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 transition-colors hover:bg-white/10 hover:text-white">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}