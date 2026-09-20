'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { X, Check, XCircle, EyeOff, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import type { Review } from '@/types';
import { Star } from 'lucide-react';

interface ReviewViewDrawerProps {
  review: Review | null;
  onClose: () => void;
  onUpdate: () => void;
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

export function ReviewViewDrawer({ review, onClose, onUpdate }: ReviewViewDrawerProps) {
  const [updatingStatus, setUpdatingStatus] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!review) return;

    setUpdatingStatus(newStatus);
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
      onUpdate();
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async () => {
    if (!review) return;

    if (!confirm(`Delete review? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
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
      onUpdate();
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={[
        'fixed inset-0 z-50',
        review ? 'visible' : 'invisible',
      ].join(' ')}
    >
      <div
        className={[
          'absolute inset-0 bg-slate-950/25 backdrop-blur-sm transition-opacity duration-300',
          review ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            onClose();
          }
        }}
        role="button"
        tabIndex={-1}
      />
      <div
        className={[
          'absolute inset-y-0 right-0 z-50 w-[92%] max-w-md border-l border-white/30 bg-white/90 shadow-2xl backdrop-blur-xl flex flex-col transition-transform duration-300 ease-out',
          review ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-slate-200/70 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Review details
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-slate-900">
              {review ? `Review #${review.id.slice(0, 8)}` : 'Review'}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            aria-label="Close review details"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!review ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Select a review to view details.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <StatusBadge variant={statusVariantMap[review.status]}>
                  {review.status}
                </StatusBadge>
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
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    Customer
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {review.customer_name ?? 'Customer'}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    Product
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-700">
                    {review.product_name ?? 'Unknown product'}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    Order
                  </p>
                  <p className="mt-2 text-sm font-mono text-slate-700">
                    {review.order_id}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    Review
                  </p>
                  <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                    {review.review_text}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Timeline
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-2 w-2 shrink-0 items-center justify-center rounded-full bg-violet-600 mt-1.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
                    </div>
                  </div>
                  {review.created_at !== review.updated_at && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-2 w-2 shrink-0 items-center justify-center rounded-full bg-slate-400 mt-1.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Last updated</p>
                        <p className="text-xs text-muted-foreground">{formatDate(review.updated_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {review.status === 'pending' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Moderate
                  </p>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleStatusUpdate('approved')}
                      disabled={updatingStatus === 'approved'}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                      onClick={() => handleStatusUpdate('rejected')}
                      disabled={updatingStatus === 'rejected'}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {review.status === 'approved' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Moderate
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
                    onClick={() => handleStatusUpdate('hidden')}
                    disabled={updatingStatus === 'hidden'}
                  >
                    <EyeOff className="mr-2 h-4 w-4" />
                    Hide from storefront
                  </Button>
                </div>
              )}

              {review.status === 'hidden' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Moderate
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => handleStatusUpdate('approved')}
                    disabled={updatingStatus === 'approved'}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Restore to storefront
                  </Button>
                </div>
              )}

              {review.status === 'rejected' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Moderate
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => handleStatusUpdate('approved')}
                    disabled={updatingStatus === 'approved'}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Approve anyway
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {review && (
          <div className="border-t border-slate-200/70 p-5 space-y-2">
            <Button
              variant="outline"
              className="w-full border-red-200 text-red-700 hover:bg-red-50"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete review permanently'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
