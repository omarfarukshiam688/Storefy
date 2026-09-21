'use client';

import * as React from 'react';
import { Users, Clock } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface MemberRow {
  id: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

interface TenantMembersClientProps {
  tenantId: string;
  tenantName: string;
  initialMembers: MemberRow[];
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export function TenantMembersClient({
  tenantId,
  tenantName,
  initialMembers,
}: TenantMembersClientProps) {
  const [members] = React.useState<MemberRow[]>(initialMembers);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/platform/tenants/${tenantId}`}>
            <Users className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
            Tenant Members
          </p>
          <h1 className="text-2xl font-bold tracking-[-0.05em] text-slate-900">
            {tenantName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white/80 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] backdrop-blur-sm overflow-hidden">
        {members.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-500">No members found</p>
          </div>
        ) : (
          <>
            <div className="sm:hidden space-y-3 p-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                      <span className="text-sm font-bold">
                        {(member.user?.name ?? member.user?.email ?? 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 line-clamp-1">
                        {member.user?.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">{member.user?.email}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <StatusBadge variant={member.role === 'tenant_admin' ? 'brand' : 'neutral'}>
                      {member.role}
                    </StatusBadge>
                    <StatusBadge variant={member.is_active ? 'success' : 'error'}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {member.last_login_at
                        ? `Last login: ${formatDate(member.last_login_at)}`
                        : 'Never logged in'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-[linear-gradient(90deg,rgba(247,243,255,0.9),rgba(240,248,255,0.8))]">
                  <tr className="border-b border-violet-100">
                    <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Member
                    </th>
                    <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Role
                    </th>
                    <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Status
                    </th>
                    <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Last Login
                    </th>
                    <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-violet-50/45"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                            <span className="text-sm font-bold">
                              {(member.user?.name ?? member.user?.email ?? 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-slate-900 line-clamp-1">
                              {member.user?.name ?? 'Unknown'}
                            </span>
                            <span className="text-xs text-slate-500 line-clamp-1">
                              {member.user?.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge variant={member.role === 'tenant_admin' ? 'brand' : 'neutral'}>
                          {member.role}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge variant={member.is_active ? 'success' : 'error'}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500">
                          {member.last_login_at
                            ? formatDate(member.last_login_at)
                            : 'Never'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500">
                          {formatDate(member.created_at)}
                        </span>
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
