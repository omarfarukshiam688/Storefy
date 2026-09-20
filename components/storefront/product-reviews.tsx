'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PaginatedReviews, Review, ReviewSummary } from '@/types';

interface ProductReviewsProps {
  tenantSlug: string;
  productId: string;
  initialReviews: Review[];
  initialSummary: ReviewSummary;
  initialTotalPages: number;
}

const REVIEW_PAGE_SIZE = 10;

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export function ProductReviews({
  tenantSlug,
  productId,
  initialReviews,
  initialSummary,
  initialTotalPages,
}: ProductReviewsProps) {
  const [reviews, setReviews] = React.useState<Review[]>(initialReviews);
  const [summary] = React.useState<ReviewSummary>(initialSummary);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(initialTotalPages);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const isLoadingMoreRef = React.useRef(false);
  const hasMore = currentPage < totalPages;
  const [showForm, setShowForm] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [rating, setRating] = React.useState(0);
  const [hoverRating, setHoverRating] = React.useState(0);
  const [orderNumber, setOrderNumber] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [reviewText, setReviewText] = React.useState('');

  const averageRating = summary.average_rating;
  const totalReviews = summary.total_reviews;

  const handleLoadMore = async () => {
    if (isLoadingMoreRef.current || currentPage >= totalPages) {
      return;
    }

    const nextPage = currentPage + 1;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    setLoadError(null);

    try {
      const searchParams = new URLSearchParams({
        tenantSlug,
        page: String(nextPage),
        page_size: String(REVIEW_PAGE_SIZE),
      });
      const response = await fetch(
        `/api/reviews/product/${encodeURIComponent(productId)}?${searchParams.toString()}`,
      );
      const result = (await response.json()) as Partial<PaginatedReviews> & { error?: string };

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load more reviews');
      }

      if (!Array.isArray(result.reviews) || typeof result.total_pages !== 'number') {
        throw new Error('Invalid review pagination response');
      }

      setReviews((currentReviews) => {
        const existingIds = new Set(currentReviews.map((review) => review.id));
        const newReviews = result.reviews?.filter((review) => !existingIds.has(review.id)) ?? [];
        return [...currentReviews, ...newReviews];
      });
      setCurrentPage(nextPage);
      setTotalPages(result.total_pages);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load more reviews';
      setLoadError(message);
      toast.error(message);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug,
          product_id: productId,
          order_number: orderNumber,
          customer_phone: phone,
          rating,
          review_text: reviewText,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Failed to submit review');
        return;
      }

      toast.success('Review submitted! It will appear after moderation.');
      setShowForm(false);
      setRating(0);
      setOrderNumber('');
      setPhone('');
      setReviewText('');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-16 border-t border-slate-100 bg-slate-50/50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-[-0.04em] text-slate-900 sm:text-3xl">
            Customer Reviews
          </h2>
          {totalReviews > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-5 w-5',
                      i < Math.round(averageRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-slate-700">
                {averageRating.toFixed(1)} out of 5
              </span>
              <span className="text-sm text-slate-500">
                ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}
          {totalReviews === 0 && (
            <p className="mt-3 text-sm text-slate-600">
              No reviews yet. Be the first to review this product!
            </p>
          )}
        </div>

        {totalReviews > 0 && (
          <div className="mt-10 space-y-4">
            {reviews.map((review) => (
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

        {hasMore && (
          <div className="mt-10">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              loading={isLoadingMore}
              className="h-11"
            >
              Load more reviews
            </Button>
            {loadError && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {loadError}
              </p>
            )}
          </div>
        )}

        <div className="mt-10">
          {!showForm ? (
            <Button
              variant="outline"
              onClick={() => setShowForm(true)}
              className="h-11"
            >
              Write a review
            </Button>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Write a review</h3>
              <p className="mt-1 text-sm text-slate-600">
                Enter your order details to verify your purchase.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Order number</Label>
                  <Input
                    id="orderNumber"
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="ORD-XXXXX"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rating</Label>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setRating(i + 1)}
                        onMouseEnter={() => setHoverRating(i + 1)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1"
                        aria-label={`${i + 1} star${i > 0 ? 's' : ''}`}
                      >
                        <Star
                          className={cn(
                            'h-6 w-6 transition-colors',
                            (hoverRating || rating) > i
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          )}
                        />
                      </button>
                    ))}
                    {rating > 0 && (
                      <span className="ml-2 text-sm text-slate-600">
                        {rating} out of 5
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reviewText">Your review</Label>
                  <textarea
                    id="reviewText"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your experience with this product..."
                    rows={4}
                    className="flex w-full rounded-lg border border-input bg-background px-4 py-3 text-base shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={isSubmitting} className="h-11">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit review
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setRating(0);
                    }}
                    className="h-11"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
