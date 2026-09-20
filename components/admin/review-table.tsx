'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Eye, Check, X, EyeOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import type { Review } from '@/types';
import { Star } from 'lucide-react';

interface ReviewTableProps {
  reviews: Review[];
  onSelectReview: (review: Review) => void;
}

const statusVariantMap: Record<string, 'success' | 'error' | 'info' | 'warning' | 'brand' | 'neutral'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  hidden: 'neutral',
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

export function ReviewTable({ reviews, onSelectReview }: ReviewTableProps) {
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const handleStatusUpdate = async (review: Review, newStatus: string) => {
    setUpdatingId(review.id);
    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error(result.error ?? `Failed to ${newStatus} review`);
        return;
      }

      toast.success(`Review ${newStatus}`);
      window.location.reload();
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (review: Review) => {
    if (!confirm(`Delete review #${review.id.slice(0, 8)}? This cannot be undone.`)) {
      return;
    }

    setDeletingId(review.id);
    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-confirm-delete': 'true',
        },
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error(result.error ?? 'Failed to delete review');
        return;
      }

      toast.success('Review deleted');
      window.location.reload();
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'h-3.5 w-3.5',
                        i < review.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      )}
                    />
                  ))}
                </div>
                <p className="mt-2 text-sm text-slate-700 line-clamp-2">
                  {review.review_text}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge variant={statusVariantMap[review.status]}>
                    {review.status}
                  </StatusBadge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(review.created_at)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
                onClick={() => onSelectReview(review)}
                aria-label={`View review`}
              >
                <Eye className="h-4 w-4" />
              </Button>
              {review.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                  onClick={() => handleStatusUpdate(review, 'approved')}
                  disabled={updatingId === review.id}
                  aria-label={`Approve review`}
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
              {review.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleStatusUpdate(review, 'rejected')}
                  disabled={updatingId === review.id}
                  aria-label={`Reject review`}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {review.status === 'approved' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                  onClick={() => handleStatusUpdate(review, 'hidden')}
                  disabled={updatingId === review.id}
                  aria-label={`Hide review`}
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              )}
              {review.status === 'hidden' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                  onClick={() => handleStatusUpdate(review, 'approved')}
                  disabled={updatingId === review.id}
                  aria-label={`Unhide review`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-700"
                onClick={() => handleDelete(review)}
                disabled={deletingId === review.id}
                aria-label={`Delete review`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-hidden rounded-[26px] border border-violet-100 bg-white/80 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.4)] backdrop-blur-sm sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[linear-gradient(90deg,rgba(247,243,255,0.9),rgba(240,248,255,0.8))]">
              <tr className="border-b border-violet-100">
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Product
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Rating
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Review
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Status
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Date
                </th>
                <th className="h-12 px-6 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr
                  key={review.id}
                  className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-violet-50/45"
                >
                  <td className="px-6 py-4">
                    <span className="text-sm text-foreground">
                      {review.product_name ?? 'Unknown product'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
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
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-700 line-clamp-1">
                      {review.review_text}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge variant={statusVariantMap[review.status]}>
                      {review.status}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(review.created_at)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
                        onClick={() => onSelectReview(review)}
                        aria-label={`View review`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {review.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                          onClick={() => handleStatusUpdate(review, 'approved')}
                          disabled={updatingId === review.id}
                          aria-label={`Approve review`}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {review.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleStatusUpdate(review, 'rejected')}
                          disabled={updatingId === review.id}
                          aria-label={`Reject review`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {review.status === 'approved' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                          onClick={() => handleStatusUpdate(review, 'hidden')}
                          disabled={updatingId === review.id}
                          aria-label={`Hide review`}
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      )}
                      {review.status === 'hidden' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                          onClick={() => handleStatusUpdate(review, 'approved')}
                          disabled={updatingId === review.id}
                          aria-label={`Unhide review`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleDelete(review)}
                        disabled={deletingId === review.id}
                        aria-label={`Delete review`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
