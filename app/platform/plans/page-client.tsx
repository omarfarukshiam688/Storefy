'use client';

import * as React from 'react';
import { Package, DollarSign, Users, HardDrive } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';

interface PlanRow {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  product_limit: number;
  order_limit: number;
  storage_limit_bytes: number;
  features: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: {
    tenants?: number;
  };
}

interface PlatformPlansClientProps {
  initialPlans: PlanRow[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function PlatformPlansClient({ initialPlans }: PlatformPlansClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
          Plans
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-[-0.05em] text-slate-900">
          Subscription Plans
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {initialPlans.length} plan{initialPlans.length !== 1 ? 's' : ''} available
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {initialPlans.map((plan) => (
          <div
            key={plan.id}
            className="flex flex-col rounded-2xl border border-violet-100 bg-white/80 p-6 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>
                  )}
                </div>
              </div>
              <StatusBadge variant={plan.is_active ? 'success' : 'error'}>
                {plan.is_active ? 'Active' : 'Inactive'}
              </StatusBadge>
            </div>

            <div className="mt-6">
              <p className="text-3xl font-black tracking-tight text-slate-900">
                ${(plan.price_monthly / 100).toFixed(2)}
                <span className="text-sm font-medium text-slate-500">/mo</span>
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-violet-600" />
                  <span className="text-xs font-medium text-slate-600">Products</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {plan.product_limit === -1 ? '∞' : plan.product_limit.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-violet-600" />
                  <span className="text-xs font-medium text-slate-600">Orders</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {plan.order_limit === -1 ? '∞' : plan.order_limit.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-violet-600" />
                  <span className="text-xs font-medium text-slate-600">Storage</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {formatBytes(plan.storage_limit_bytes)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-600" />
                  <span className="text-xs font-medium text-slate-600">Team Members</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {(plan.features?.team_members as number | undefined) ?? '—'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-2">
                Features
              </p>
              <div className="flex flex-wrap gap-1">
                {plan.features &&
                  Object.entries(plan.features).map(([key, value]) => (
                    <StatusBadge key={key} variant="brand">
                      {key}: {String(value)}
                    </StatusBadge>
                  ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                Created {new Intl.DateTimeFormat('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }).format(new Date(plan.created_at))}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
