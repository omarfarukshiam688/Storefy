'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import type { DocumentationCategoryWithArticles, DocumentationArticle } from '@/lib/resource-center';

interface DocumentationContentProps {
  categories: DocumentationCategoryWithArticles[];
}

export function DocumentationContent({ categories }: DocumentationContentProps) {
  const searchParams = useSearchParams();
  const selectedCategorySlug = searchParams.get('category');
  const selectedArticleSlug = searchParams.get('article');

  const findArticle = (slug: string): DocumentationArticle | null => {
    for (const category of categories) {
      const article = category.articles.find((a) => a.slug === slug);
      if (article) return article;
      for (const child of category.children) {
        const childArticle = child.articles.find((a) => a.slug === slug);
        if (childArticle) return childArticle;
      }
    }
    return null;
  };

  const findCategory = (slug: string): DocumentationCategoryWithArticles | null => {
    for (const category of categories) {
      if (category.slug === slug) return category;
      for (const child of category.children) {
        if (child.slug === slug) return child;
      }
    }
    return null;
  };

  const selectedArticle = selectedArticleSlug ? findArticle(selectedArticleSlug) : null;
  const selectedCategory = selectedCategorySlug ? findCategory(selectedCategorySlug) : null;

  if (selectedArticle) {
    return (
      <article className="space-y-8">
        <header className="space-y-4">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
            <a href="/resources/documentation" className="hover:text-violet-700">Documentation</a>
            <span aria-hidden="true">/</span>
            {selectedCategory && (
              <>
                <a
                  href={`/resources/documentation?category=${selectedCategory.slug}`}
                  className="hover:text-violet-700"
                >
                  {selectedCategory.name}
                </a>
                <span aria-hidden="true">/</span>
              </>
            )}
            <span className="text-slate-900 font-medium">{selectedArticle.title}</span>
          </nav>
          <div>
            <h1 className="text-3xl font-bold tracking-[-0.05em] text-slate-950">{selectedArticle.title}</h1>
            {selectedArticle.excerpt && (
              <p className="mt-2 text-lg leading-7 text-slate-600">{selectedArticle.excerpt}</p>
            )}
          </div>
          {selectedArticle.cover_image_path && (
            <div className="rounded-xl overflow-hidden border border-violet-100">
              <img
                src={selectedArticle.cover_image_path}
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
            dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
          />
        </div>

        <footer className="pt-8 border-t border-violet-100">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <time dateTime={selectedArticle.published_at ?? selectedArticle.created_at}>
              Published {formatDistanceToNow(new Date(selectedArticle.published_at ?? selectedArticle.created_at), { addSuffix: true })}
            </time>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-900">Was this guide helpful?</p>
            <DocumentationFeedback articleId={selectedArticle.id} />
          </div>

          <nav className="mt-8 flex items-center justify-between" aria-label="Article navigation">
            <a href="/resources/documentation" className="text-sm font-medium text-violet-700 hover:text-violet-800">
              ← Back to Documentation
            </a>
          </nav>
        </footer>
      </article>
    );
  }

  if (selectedCategory) {
    return (
      <div className="space-y-8">
        <header className="space-y-4">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
            <a href="/resources/documentation" className="hover:text-violet-700">Documentation</a>
            <span aria-hidden="true">/</span>
            <span className="text-slate-900 font-medium">{selectedCategory.name}</span>
          </nav>
          <div>
            <h1 className="text-3xl font-bold tracking-[-0.05em] text-slate-950">{selectedCategory.name}</h1>
            {selectedCategory.description && (
              <p className="mt-2 text-lg leading-7 text-slate-600">{selectedCategory.description}</p>
            )}
          </div>
        </header>

        <div className="space-y-6">
          {selectedCategory.articles.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900">Articles</h2>
              <ul className="mt-4 space-y-3">
                {selectedCategory.articles.map((article) => (
                  <li key={article.id}>
                    <a
                      href={`/resources/documentation?category=${selectedCategory.slug}&article=${article.slug}`}
                      className="group flex items-center gap-3 rounded-lg border border-violet-100 bg-white/80 p-4 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700 group-hover:bg-violet-100 transition-colors">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 group-hover:text-violet-700 transition-colors">{article.title}</h3>
                        {article.excerpt && <p className="text-sm text-slate-500 truncate">{article.excerpt}</p>}
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {selectedCategory.children.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900">Subcategories</h2>
              <ul className="mt-4 space-y-3">
                {selectedCategory.children.map((child) => (
                  <li key={child.id}>
                    <a
                      href={`/resources/documentation?category=${child.slug}`}
                      className="group flex items-center gap-3 rounded-lg border border-violet-100 bg-white/80 p-4 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700 group-hover:bg-violet-100 transition-colors">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 group-hover:text-violet-700 transition-colors">{child.name}</h3>
                        {child.description && <p className="text-sm text-slate-500 truncate">{child.description}</p>}
                        <p className="text-xs text-slate-400">{child.articles.length} articles</p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {selectedCategory.articles.length === 0 && selectedCategory.children.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-slate-900">No content yet</h3>
              <p className="mt-1 text-slate-500">This category doesn&apos;t have any articles or subcategories.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold tracking-[-0.05em] text-slate-950">Documentation</h1>
        <p className="text-lg leading-7 text-slate-600">
          Browse our comprehensive guides to learn how to use Storefy effectively.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        {categories.map((category) => (
          <a
            key={category.id}
            href={`/resources/documentation?category=${category.slug}`}
            className="group rounded-2xl border border-violet-100 bg-white/80 p-6 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 group-hover:bg-violet-100 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-violet-700 transition-colors">{category.name}</h3>
                {category.description && <p className="mt-1 text-sm text-slate-500 line-clamp-2">{category.description}</p>}
                <p className="mt-2 text-xs text-slate-400">
                  {category.articles.length} articles
                  {category.children.length > 0 && `, ${category.children.length} subcategories`}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-slate-900">No documentation available</h3>
          <p className="mt-1 text-slate-500">Documentation will appear here once published by the Storefy team.</p>
        </div>
      )}
    </div>
  );
}

interface DocumentationFeedbackProps {
  articleId: string;
}

function DocumentationFeedback({ articleId }: DocumentationFeedbackProps) {
  const [feedback, setFeedback] = React.useState<'positive' | 'negative' | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleFeedback = async (value: 'positive' | 'negative') => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/resource-center/documentation/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId, is_helpful: value === 'positive' }),
      });
      if (res.ok) {
        setFeedback(value);
      }
    } catch {
      // Silently fail
    } finally {
      setSubmitting(false);
    }
  };

  if (feedback) {
    return (
      <div className="mt-3 flex items-center gap-3 text-sm text-emerald-700">
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
        <span>Thank you for your feedback!</span>
      </div>
    );
  }

  return (
    <div className="mt-3 flex gap-2" role="group" aria-label="Documentation feedback">
      <button
        type="button"
        onClick={() => handleFeedback('positive')}
        disabled={submitting}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:border-emerald-300 disabled:opacity-50"
        aria-label="Yes, this was helpful"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
        <span>Yes</span>
      </button>
      <button
        type="button"
        onClick={() => handleFeedback('negative')}
        disabled={submitting}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:border-red-300 disabled:opacity-50"
        aria-label="No, this was not helpful"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
        <span>No</span>
      </button>
    </div>
  );
}