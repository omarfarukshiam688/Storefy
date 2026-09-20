'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ReviewTable } from '@/components/admin/review-table';
import { ReviewFilters } from '@/components/admin/review-filters';
import { ReviewViewDrawer } from '@/components/admin/review-view-drawer';
import { MessageSquare } from 'lucide-react';
import type { Review } from '@/types';

interface ReviewsPageClientProps {
  initialReviews: Review[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
}

export function ReviewsPageClient({
  initialReviews,
  initialTotal,
  initialPage,
  initialTotalPages,
}: ReviewsPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedReview, setSelectedReview] = React.useState<Review | null>(null);

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 rounded-[28px] border border-violet-200/80 bg-[linear-gradient(135deg,rgba(248,245,255,0.95),rgba(239,248,255,0.9))] p-5 shadow-[0_20px_55px_-35px_rgba(76,29,149,0.45)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">
            <MessageSquare className="h-3.5 w-3.5" />
            Customer feedback
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.06em] text-slate-900">
            Reviews
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {initialTotal} {initialTotal === 1 ? 'review' : 'reviews'} total
          </p>
        </div>
      </div>

      <div className="rounded-[24px] border border-violet-100 bg-white/75 p-4 shadow-[0_16px_40px_-30px_rgba(76,29,149,0.4)] sm:p-5">
        <ReviewFilters />
      </div>

      {initialReviews.length > 0 && (
        <ReviewTable
          reviews={initialReviews}
          onSelectReview={setSelectedReview}
        />
      )}

      {initialPage === 1 && initialReviews.length === 0 && initialTotal === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 sm:p-12 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium text-slate-900">No reviews yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Reviews will appear here when customers submit them through your storefront.
          </p>
        </div>
      )}

      {initialTotalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Page {initialPage} of {initialTotalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={initialPage <= 1}
              onClick={() => goToPage(initialPage - 1)}
              className="h-9"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={initialPage >= initialTotalPages}
              onClick={() => goToPage(initialPage + 1)}
              className="h-9"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ReviewViewDrawer
        review={selectedReview}
        onClose={() => setSelectedReview(null)}
        onUpdate={() => {
          setSelectedReview(null);
          router.refresh();
        }}
      />
    </div>
  );
}
