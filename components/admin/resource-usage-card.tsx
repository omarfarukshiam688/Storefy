import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResourceUsageCardProps {
  title: string;
  icon: LucideIcon;
  used: number;
  limit: number;
  className?: string;
  format?: (value: number) => string;
}

function getState(used: number, limit: number): 'normal' | 'approaching' | 'near-limit' | 'reached' | 'unlimited' {
  if (limit === -1) return 'unlimited';
  if (used >= limit) return 'reached';
  const ratio = used / limit;
  if (ratio >= 0.9) return 'near-limit';
  if (ratio >= 0.7) return 'approaching';
  return 'normal';
}

const stateStyles: Record<string, { bar: string; badge: string; border: string }> = {
  normal: {
    bar: 'bg-violet-500',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    border: 'border-violet-100',
  },
  approaching: {
    bar: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    border: 'border-amber-200',
  },
  'near-limit': {
    bar: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 border-red-200',
    border: 'border-red-200',
  },
  reached: {
    bar: 'bg-red-600',
    badge: 'bg-red-50 text-red-700 border-red-200',
    border: 'border-red-300',
  },
  unlimited: {
    bar: 'bg-violet-300',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    border: 'border-violet-100',
  },
};

export function ResourceUsageCard({
  title,
  icon: Icon,
  used,
  limit,
  className,
  format = (v) => String(v),
}: ResourceUsageCardProps) {
  const state = getState(used, limit);
  const styles = stateStyles[state];

  const progress = limit === -1 ? 0 : Math.min((used / limit) * 100, 100);
  const remaining = limit === -1 ? Infinity : Math.max(limit - used, 0);
  const displayRemaining = limit === -1 ? 'Unlimited' : format(remaining);

  const stateLabel: Record<string, string> = {
    normal: '',
    approaching: 'Approaching limit',
    'near-limit': 'Near limit',
    reached: 'Limit reached',
    unlimited: 'Unlimited',
  };

  return (
    <div
      className={cn(
        'flex flex-col justify-between rounded-2xl border bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]',
        styles.border,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
          <Icon className="h-5 w-5" />
        </div>
        {state !== 'normal' && state !== 'unlimited' && (
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
              styles.badge
            )}
          >
            {stateLabel[state]}
          </span>
        )}
        {state === 'unlimited' && (
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
              styles.badge
            )}
          >
            Unlimited
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {title}
        </p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          {limit === -1 ? `${format(used)} / Unlimited` : `${format(used)} / ${format(limit)}`}
        </p>

        {limit !== -1 && (
          <>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
              <div
                className={cn('h-2 rounded-full transition-all duration-300', styles.bar)}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {remaining === 0 ? (
                <span className="font-semibold text-red-600">No slots remaining</span>
              ) : (
                <>
                  <span className="font-medium text-slate-700">{displayRemaining}</span> remaining
                </>
              )}
            </p>
          </>
        )}

        {limit === -1 && (
          <p className="mt-2 text-xs text-slate-500">
            No limits on this plan
          </p>
        )}
      </div>
    </div>
  );
}
