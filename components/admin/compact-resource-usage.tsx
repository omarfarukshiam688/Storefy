import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactResourceUsageProps {
  title: string;
  icon: LucideIcon;
  used: number;
  limit: number;
  format?: (value: number) => string;
  className?: string;
}

function getState(used: number, limit: number): 'normal' | 'approaching' | 'near-limit' | 'reached' | 'unlimited' {
  if (limit === -1) return 'unlimited';
  if (used >= limit) return 'reached';
  const ratio = used / limit;
  if (ratio >= 0.9) return 'near-limit';
  if (ratio >= 0.7) return 'approaching';
  return 'normal';
}

const stateColorMap: Record<string, { text: string; bg: string; border: string; bar: string }> = {
  normal: {
    text: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    bar: 'bg-violet-500',
  },
  approaching: {
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    bar: 'bg-amber-500',
  },
  'near-limit': {
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    bar: 'bg-red-500',
  },
  reached: {
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    bar: 'bg-red-600',
  },
  unlimited: {
    text: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    bar: 'bg-violet-300',
  },
};

export function CompactResourceUsage({
  title,
  icon: Icon,
  used,
  limit,
  format = (v) => String(v),
  className,
}: CompactResourceUsageProps) {
  const state = getState(used, limit);
  const colors = stateColorMap[state];

  const progress = limit === -1 ? 0 : Math.min((used / limit) * 100, 100);
  const remaining = limit === -1 ? Infinity : Math.max(limit - used, 0);
  const displayRemaining = limit === -1 ? 'Unlimited' : format(remaining);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 rounded-xl border bg-white/70 px-3 py-2 shadow-sm',
        colors.border,
        className
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className={cn('text-xs font-semibold', colors.text)}>{title}</p>
        <p className="text-xs text-slate-500">
          {limit === -1 ? `${format(used)} / Unlimited` : `${format(used)} / ${format(limit)}`}
          {limit !== -1 && <span className="ml-1 text-slate-400">· {displayRemaining} remaining</span>}
        </p>
        {limit !== -1 && (
          <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn('h-full rounded-full transition-all duration-300', colors.bar)}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
