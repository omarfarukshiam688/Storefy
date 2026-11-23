'use client';

import Link from 'next/link';
import { Calendar, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { BlogCategoryWithContent } from '@/lib/resource-center';

interface BlogArticlesTabProps {
  categories: BlogCategoryWithContent[];
}

export function BlogArticlesTab({ categories }: BlogArticlesTabProps) {
  const allArticles = categories.flatMap((cat) =>
    cat.articles.map((article) => ({ ...article, categoryName: cat.name, categorySlug: cat.slug }))
  );

  if (allArticles.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700 mb-4">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900">No articles yet</h3>
        <p className="mt-2 text-sm text-slate-500">Educational articles will appear here once published.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        {allArticles.map((article) => (
          <Link
            key={article.id}
            href={`/resources/blog/articles/${article.slug}`}
            className="group flex gap-4 rounded-2xl border border-violet-100 bg-white/80 p-4 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
          >
            {article.cover_image_path && (
              <div className="relative h-32 w-48 shrink-0 overflow-hidden rounded-xl">
                <img
                  src={article.cover_image_path}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3" aria-hidden="true" />
                    {article.categoryName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" aria-hidden="true" />
                    {formatDistanceToNow(new Date(article.published_at ?? article.created_at), { addSuffix: true })}
                  </span>
                </div>

                <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-violet-700 transition-colors">
                  {article.title}
                </h3>

                {article.excerpt && (
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">{article.excerpt}</p>
                )}

                {article.author_name && (
                  <p className="mt-2 text-xs text-slate-500">By {article.author_name}</p>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm font-medium text-violet-700 pt-2 border-t border-violet-100">
                Read article
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}