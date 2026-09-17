'use client';

import * as React from 'react';
import Link from 'next/link';
import { Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StoreNotFoundProps {
  slug: string;
}

export function StoreNotFound({ slug }: StoreNotFoundProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Store className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-[-0.04em] text-slate-900 sm:text-3xl">
        Store not found
      </h1>
      <p className="mt-3 max-w-md text-base text-slate-600">
        The store <span className="font-mono text-sm text-slate-500">/{slug}</span> does not exist
        or is no longer available.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">Go to Storefy</Link>
        </Button>
      </div>
    </div>
  );
}
