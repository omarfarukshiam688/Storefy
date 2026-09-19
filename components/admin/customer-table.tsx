'use client';

import * as React from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import type { Customer, CustomerStatus } from '@/types';

interface CustomerTableProps {
  customers: Customer[];
}

const statusVariantMap: Record<CustomerStatus, 'success' | 'error' | 'info' | 'warning' | 'brand' | 'neutral'> = {
  active: 'success',
  inactive: 'neutral',
  blocked: 'error',
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

function maskEmail(email: string | null): string {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!domain) return '—';
  const maskedLocal = local.length > 2 ? `${local.slice(0, 2)}***` : `${local}***`;
  return `${maskedLocal}@${domain}`;
}

export function CustomerTable({ customers }: CustomerTableProps) {
  if (customers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
        <p className="text-sm text-muted-foreground">No customers found</p>
        <p className="text-xs text-muted-foreground mt-1">
          Try adjusting your filters or search.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/dashboard/customers/${customer.id}`}
                  className="font-semibold text-sm text-foreground hover:text-primary transition-colors"
                >
                  {customer.name}
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {maskEmail(customer.email)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {customer.phone}
                </p>
              </div>
              <StatusBadge variant={statusVariantMap[customer.status]}>
                {customer.status}
              </StatusBadge>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Added {formatDate(customer.created_at)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
                asChild
              >
                <Link href={`/dashboard/customers/${customer.id}`} aria-label={`View ${customer.name}`}>
                  <Eye className="h-4 w-4" />
                </Link>
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
                  Customer
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Phone
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Email
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  District
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Status
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Created
                </th>
                <th className="h-12 px-6 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-violet-50/45"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium">{customer.name}</span>
                      {customer.address && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {customer.address}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{customer.phone}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{maskEmail(customer.email)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">{customer.district ?? '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge variant={statusVariantMap[customer.status]}>
                      {customer.status}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(customer.created_at)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
                      asChild
                    >
                      <Link href={`/dashboard/customers/${customer.id}`} aria-label={`View ${customer.name}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
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
