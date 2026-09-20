import type { ReviewsSectionConfig } from '@/types';
import type { Review } from '@/types';
import { Star } from 'lucide-react';

interface ReviewsSectionProps {
  config: ReviewsSectionConfig;
  reviews?: Review[];
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export function ReviewsSection({ config, reviews = [] }: ReviewsSectionProps) {
  const heading = config.heading || 'Reviews';
  const description = config.description || '';

  const displayReviews = reviews.slice(0, 5);

  return (
    <section className="border-t border-slate-100 bg-slate-50/50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-[-0.04em] text-slate-900 sm:text-3xl">
            {heading}
          </h2>
          {description && (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {description}
            </p>
          )}
        </div>

        {displayReviews.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center transition-all duration-200 hover:border-violet-200 hover:shadow-sm">
            <p className="text-sm text-slate-500">
              Customer reviews will appear here once available.
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-4">
            {displayReviews.map((review) => (
              <div
                key={review.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'h-4 w-4',
                          i < review.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }).format(new Date(review.created_at))}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">
                  {review.review_text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
