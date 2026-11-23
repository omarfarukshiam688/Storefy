'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, BookOpen, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentationCategoryWithArticles, DocumentationArticle } from '@/lib/resource-center';

interface DocumentationSidebarProps {
  categories: DocumentationCategoryWithArticles[];
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function DocumentationSidebar({ categories, isMobileOpen, onCloseMobile }: DocumentationSidebarProps) {
  const searchParams = useSearchParams();
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<Array<{ article: DocumentationArticle; category: DocumentationCategoryWithArticles }>>([]);

  const selectedCategorySlug = searchParams.get('category');
  const selectedArticleSlug = searchParams.get('article');

  const isCategoryActive = (category: DocumentationCategoryWithArticles) => {
    if (selectedCategorySlug === category.slug) return true;
    return category.children.some((child) => child.slug === selectedCategorySlug);
  };

  const isArticleActive = (articleSlug: string) => selectedArticleSlug === articleSlug;

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`/api/search/documentation?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results ?? []);
      }
    } catch {
      setSearchResults([]);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSearch(e.target.value);
  };

  const handleNavigationClick = () => {
    if (window.innerWidth < 1024) {
      onCloseMobile();
    }
  };

  if (searchQuery.length >= 2) {
    return (
      <div className="h-full flex flex-col border-r border-violet-200 bg-white/50 p-4 lg:border-r-0 lg:bg-transparent lg:p-0">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search documentation..."
            className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Search documentation"
          />
        </div>

        <nav className="flex-1 overflow-y-auto space-y-1" aria-label="Search results">
          {searchResults.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No results found</p>
          ) : (
            <ul className="space-y-1">
              {searchResults.map((result) => (
                <li key={result.article.id}>
                  <Link
                    href={`/resources/documentation?category=${result.category.slug}&article=${result.article.slug}`}
                    onClick={handleNavigationClick}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                      isArticleActive(result.article.slug)
                        ? 'bg-violet-100 text-violet-700'
                        : 'text-slate-600 hover:bg-violet-50 hover:text-slate-900'
                    )}
                  >
                    <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{result.article.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </div>
    );
  }

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-drawer-title"
        >
          <div
            className="fixed inset-0 bg-black/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-full max-w-xs bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
            <div className="flex items-center justify-between p-4 border-b border-violet-100">
              <h2 id="mobile-drawer-title" className="text-lg font-semibold text-slate-900">Documentation</h2>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-2 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-slate-700"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative mb-4 p-4 border-b border-violet-100">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search documentation..."
                className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Search documentation"
              />
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Documentation categories">
              {categories.map((category) => (
                <MobileCategoryItem
                  key={category.id}
                  category={category}
                  isActive={isCategoryActive(category)}
                  isExpanded={expandedCategories.has(category.id)}
                  onToggle={() => toggleCategory(category.id)}
                  selectedArticleSlug={selectedArticleSlug}
                  onNavigate={handleNavigationClick}
                />
              ))}
            </nav>
          </div>
        </div>
      )}

      <aside className="hidden lg:block lg:w-64 lg:flex-shrink-0 border-r border-violet-200 bg-white/50 p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search documentation..."
            className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Search documentation"
          />
        </div>

        <nav className="flex-1 overflow-y-auto space-y-1" aria-label="Documentation categories">
          {categories.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              isActive={isCategoryActive(category)}
              isExpanded={expandedCategories.has(category.id)}
              onToggle={() => toggleCategory(category.id)}
              selectedArticleSlug={selectedArticleSlug}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}

interface MobileCategoryItemProps {
  category: DocumentationCategoryWithArticles;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  selectedArticleSlug: string | null;
  onNavigate: () => void;
}

function MobileCategoryItem({ category, isActive, isExpanded, onToggle, selectedArticleSlug, onNavigate }: MobileCategoryItemProps) {
  const hasChildren = category.children.length > 0;
  const hasArticles = category.articles.length > 0;

  return (
    <div className="space-y-1">
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'bg-violet-100 text-violet-700'
              : 'text-slate-600 hover:bg-violet-50 hover:text-slate-900'
          )}
          aria-expanded={isExpanded}
        >
          <span className="truncate">{category.name}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0',
              isExpanded && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>
      ) : (
        <span className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
          isActive ? 'bg-violet-100 text-violet-700' : 'text-slate-600'
        )}>
          {category.name}
        </span>
      )}

      {isExpanded && (
        <div className="ml-4 space-y-1 border-l border-violet-100 pl-3">
          {category.children.map((child) => (
            <MobileCategoryItem
              key={child.id}
              category={child}
              isActive={isCategoryActive(child)}
              isExpanded={false}
              onToggle={() => {}}
              selectedArticleSlug={selectedArticleSlug}
              onNavigate={onNavigate}
            />
          ))}
          {category.articles.map((article) => (
            <Link
              key={article.id}
              href={`/resources/documentation?category=${category.slug}&article=${article.slug}`}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                selectedArticleSlug === article.slug
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-slate-600 hover:bg-violet-50 hover:text-slate-900'
              )}
            >
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{article.title}</span>
            </Link>
          ))}
        </div>
      )}

      {!hasChildren && hasArticles && (
        <div className="ml-4 space-y-1">
          {category.articles.map((article) => (
            <Link
              key={article.id}
              href={`/resources/documentation?category=${category.slug}&article=${article.slug}`}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                selectedArticleSlug === article.slug
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-slate-600 hover:bg-violet-50 hover:text-slate-900'
              )}
            >
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{article.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function isCategoryActive(category: DocumentationCategoryWithArticles): boolean {
  const searchParams = new URLSearchParams(window.location.search);
  const selectedCategorySlug = searchParams.get('category');
  if (selectedCategorySlug === category.slug) return true;
  return category.children.some((child) => child.slug === selectedCategorySlug);
}

interface CategoryItemProps {
  category: DocumentationCategoryWithArticles;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  selectedArticleSlug: string | null;
}

function CategoryItem({ category, isActive, isExpanded, onToggle, selectedArticleSlug }: CategoryItemProps) {
  const hasChildren = category.children.length > 0;
  const hasArticles = category.articles.length > 0;

  return (
    <div className="space-y-1">
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'bg-violet-100 text-violet-700'
              : 'text-slate-600 hover:bg-violet-50 hover:text-slate-900'
          )}
          aria-expanded={isExpanded}
        >
          <span className="truncate">{category.name}</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0',
              isExpanded && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>
      ) : (
        <span className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
          isActive ? 'bg-violet-100 text-violet-700' : 'text-slate-600'
        )}>
          {category.name}
        </span>
      )}

      {isExpanded && (
        <div className="ml-4 space-y-1 border-l border-violet-100 pl-3">
          {category.children.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              isActive={isCategoryActive(child)}
              isExpanded={false}
              onToggle={() => {}}
              selectedArticleSlug={selectedArticleSlug}
            />
          ))}
          {category.articles.map((article) => (
            <Link
              key={article.id}
              href={`/resources/documentation?category=${category.slug}&article=${article.slug}`}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                selectedArticleSlug === article.slug
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-slate-600 hover:bg-violet-50 hover:text-slate-900'
              )}
            >
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{article.title}</span>
            </Link>
          ))}
        </div>
      )}

      {!hasChildren && hasArticles && (
        <div className="ml-4 space-y-1">
          {category.articles.map((article) => (
            <Link
              key={article.id}
              href={`/resources/documentation?category=${category.slug}&article=${article.slug}`}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                selectedArticleSlug === article.slug
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-slate-600 hover:bg-violet-50 hover:text-slate-900'
              )}
            >
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{article.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}