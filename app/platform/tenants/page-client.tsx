'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, ChevronDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  plan_id: string;
  plan: {
    id: string;
    name: string;
    description: string | null;
    price_monthly: number;
    product_limit: number;
    order_limit: number;
    storage_limit_bytes: number;
    features: Record<string, unknown>;
    is_active: boolean;
  } | null;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  usage: {
    products: number;
    orders: number;
    members: number;
  };
}

interface PlatformTenantsClientProps {
  initialTenants: TenantRow[];
  initialTotal: number;
  initialSearch?: string;
  initialStatus?: string;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr));
}

export function PlatformTenantsClient({
  initialTenants,
  initialTotal,
  initialSearch,
  initialStatus,
}: PlatformTenantsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(initialSearch ?? '');
  const [status, setStatus] = React.useState(initialStatus ?? '');
  const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`/platform/tenants?${params.toString()}`);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => {
      updateParams({ search: value || undefined });
    }, 300);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    updateParams({ status: value || undefined });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
            Governance
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.05em] text-slate-900">
            Tenant Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {initialTotal} tenant{initialTotal !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              {status ? `Status: ${status}` : 'All Status'}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleStatusChange('')}>
              All Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('active')}>
              Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange('suspended')}>
              Suspended
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white/80 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] backdrop-blur-sm overflow-hidden">
        {initialTenants.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-500">No tenants found</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3 p-4">
              {initialTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                        <span className="text-sm font-bold">
                          {tenant.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground line-clamp-1">
                          {tenant.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                          /{tenant.slug}
                        </p>
                        {tenant.owner?.email && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {tenant.owner.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <StatusBadge variant={tenant.is_active ? 'success' : 'error'}>
                      {tenant.is_active ? 'Active' : 'Suspended'}
                    </StatusBadge>
                    {tenant.plan && (
                      <StatusBadge variant="brand">{tenant.plan.name}</StatusBadge>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>Products: {formatNumber(tenant.usage.products)}</span>
                    <span>Orders: {formatNumber(tenant.usage.orders)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Created {formatDate(tenant.created_at)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      asChild
                    >
                      <a href={`/platform/tenants/${tenant.id}`}>
                        View <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-[linear-gradient(90deg,rgba(247,243,255,0.9),rgba(240,248,255,0.8))]">
                  <tr className="border-b border-violet-100">
                    <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Tenant
                    </th>
                    <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Owner
                    </th>
                    <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Plan
                    </th>
                    <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Status
                    </th>
                    <th className="h-12 px-6 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Products
                    </th>
                    <th className="h-12 px-6 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Orders
                    </th>
                    <th className="h-12 px-6 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Members
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
                  {initialTenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-violet-50/45"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                            <span className="text-sm font-bold">
                              {tenant.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-slate-900 line-clamp-1">
                              {tenant.name}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              /{tenant.slug}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm text-slate-600 truncate max-w-[180px]">
                            {tenant.owner?.name ?? '—'}
                          </span>
                          <span className="text-xs text-slate-400 truncate max-w-[180px]">
                            {tenant.owner?.email ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {tenant.plan ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-900">
                              {tenant.plan.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              ${(tenant.plan.price_monthly / 100).toFixed(2)}/mo
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">No plan</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge variant={tenant.is_active ? 'success' : 'error'}>
                          {tenant.is_active ? 'Active' : 'Suspended'}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-slate-900">
                          {formatNumber(tenant.usage.products)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-slate-900">
                          {formatNumber(tenant.usage.orders)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-slate-900">
                          {formatNumber(tenant.usage.members)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500">
                          {formatDate(tenant.created_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          asChild
                        >
                          <a href={`/platform/tenants/${tenant.id}`}>
                            View <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
