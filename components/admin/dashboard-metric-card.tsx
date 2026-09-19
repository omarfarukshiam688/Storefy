import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardMetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
}

export function DashboardMetricCard({
  title,
  value,
  icon: Icon,
  className,
}: DashboardMetricCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {title}
        </p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </div>
    </div>
  );
}
