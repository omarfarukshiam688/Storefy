'use client';

import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function ProductDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <section className="mt-6 border-t border-slate-100 pt-6">
      <h2 className="text-[22px] font-extrabold tracking-tight text-slate-900">
        Product Description
      </h2>
      <p className={expanded ? 'mt-3 text-[14px] leading-6 text-slate-800 sm:text-base sm:leading-7' : 'mt-3 line-clamp-[6] text-[14px] leading-6 text-slate-800 sm:text-base sm:leading-7'}>
        {description}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-2 flex min-h-10 items-center text-sm font-bold text-blue-600"
        aria-expanded={expanded}
      >
        {expanded ? 'Read Less' : 'Read More'}
        {expanded ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
      </button>
    </section>
  );
}
