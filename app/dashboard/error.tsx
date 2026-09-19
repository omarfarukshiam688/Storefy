'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-[30px] border border-red-100 bg-white/80 p-8 text-center shadow-sm sm:p-12">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <RefreshCw className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-slate-900">
        Something went wrong
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        We couldn&apos;t load your dashboard. Please try again.
      </p>
      <Button
        onClick={reset}
        className="mt-6"
        variant="outline"
      >
        Try again
      </Button>
    </div>
  );
}
