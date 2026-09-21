'use client';

import * as React from 'react';
import { Search, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

interface PlatformUser {
  id: string;
  name: string | null;
  email: string | null;
  tenants: Array<{
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    role: string;
    created_at: string;
  }>;
}

interface PlatformUsersClientProps {
  initialUsers: PlatformUser[];
}

export function PlatformUsersClient({ initialUsers }: PlatformUsersClientProps) {
  const [search, setSearch] = React.useState('');
  const [users, setUsers] = React.useState<PlatformUser[]>(initialUsers);
  const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    if (value.trim() === '') {
      setUsers(initialUsers);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/platform/users?search=${encodeURIComponent(value)}`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users ?? []);
        }
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 300);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
            Membership
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.05em] text-slate-900">
            Platform Users
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {users.length} user{users.length !== 1 ? 's' : ''} with platform access
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search users by name or email..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white/80 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] backdrop-blur-sm overflow-hidden">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-500">No users found</p>
          </div>
        ) : (
          <>
            <div className="sm:hidden space-y-3 p-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                      <span className="text-sm font-bold">
                        {(user.name ?? user.email ?? 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 line-clamp-1">
                        {user.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {user.tenants.map((tenant) => (
                      <div
                        key={tenant.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 p-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-medium text-slate-900 truncate">
                            {tenant.name}
                          </span>
                          <StatusBadge variant={tenant.is_active ? 'success' : 'error'}>
                            {tenant.is_active ? 'Active' : 'Suspended'}
                          </StatusBadge>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge variant="brand">{tenant.role}</StatusBadge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            asChild
                          >
                            <Link href={`/platform/tenants/${tenant.id}`}>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-[linear-gradient(90deg,rgba(247,243,255,0.9),rgba(240,248,255,0.8))]">
                  <tr className="border-b border-violet-100">
                    <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      User
                    </th>
                    <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Tenants
                    </th>
                    <th className="h-12 px-6 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-violet-50/45"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                            <span className="text-sm font-bold">
                              {(user.name ?? user.email ?? 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-slate-900 line-clamp-1">
                              {user.name ?? 'Unknown'}
                            </span>
                            <span className="text-xs text-slate-500 line-clamp-1">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1">
                          {user.tenants.length === 0 ? (
                            <span className="text-xs text-slate-400">No tenants</span>
                          ) : (
                            user.tenants.slice(0, 3).map((tenant) => (
                              <span
                                key={tenant.id}
                                className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700"
                              >
                                {tenant.name}
                                <StatusBadge variant={tenant.is_active ? 'success' : 'error'}>
                                  {tenant.is_active ? 'Active' : 'Suspended'}
                                </StatusBadge>
                              </span>
                            ))
                          )}
                          {user.tenants.length > 3 && (
                            <span className="text-xs text-slate-400">
                              +{user.tenants.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {user.tenants.map((tenant) => (
                            <Button
                              key={tenant.id}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
                              asChild
                              aria-label={`View ${tenant.name}`}
                            >
                              <Link href={`/platform/tenants/${tenant.id}`}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          ))}
                        </div>
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
