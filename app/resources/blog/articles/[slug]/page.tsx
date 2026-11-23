import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBlogArticleBySlug } from '@/lib/resource-center';
import { ArrowLeft, Calendar, Tag, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ResourceCenterTabs } from '../../../resource-center-tabs';

interface BlogArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await getBlogArticleBySlug(slug);
    return {
      title: article.title,
      description: article.excerpt ?? article.content.slice(0, 160),
    };
  } catch {
    return { title: 'Article' };
  }
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params;

  let article;
  try {
    article = await getBlogArticleBySlug(slug);
  } catch {
    notFound();
  }

  const displayDate = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true })
    : formatDistanceToNow(new Date(article.created_at), { addSuffix: true });

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

        <article className="space-y-8">
          <header className="space-y-4">
            <Link
              href="/resources/blog"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-violet-700"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Blog
            </Link>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" aria-hidden="true" />
                  {article.categoryName}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  {displayDate}
                </span>
                {article.author_name && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" aria-hidden="true" />
                    {article.author_name}
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold tracking-[-0.05em] text-slate-950">{article.title}</h1>

              {article.excerpt && (
                <p className="text-lg leading-7 text-slate-600">{article.excerpt}</p>
              )}
            </div>

            {article.cover_image_path && (
              <div className="rounded-xl overflow-hidden border border-violet-100">
                <img
                  src={article.cover_image_path}
                  alt=""
                  className="w-full h-auto"
                />
              </div>
            )}
          </header>

          <div
            className="prose prose-slate max-w-none prose-headings:text-slate-950 prose-headings:font-bold prose-a:text-violet-700 prose-a:no-underline hover:prose-a:underline"
            id="article-content"
          >
            <div
              className="whitespace-pre-wrap text-base leading-7 text-slate-700"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>

          <footer className="pt-8 border-t border-violet-100">
            <nav className="flex items-center justify-between" aria-label="Article navigation">
              <a href="/resources/blog" className="text-sm font-medium text-violet-700 hover:text-violet-800">
                ← Back to Blog
              </a>
            </nav>
          </footer>
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