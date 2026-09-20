'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import type { TeamMember } from '@/lib/team';
import { TeamMembersTable } from '@/components/admin/team-members-table';
import { InvitationForm } from '@/components/admin/invitation-form';
import { PendingInvitationsList } from '@/components/admin/pending-invitations-list';

interface TeamPageClientProps {
  tenantId: string;
  currentUserId: string;
}

export function TeamPageClient({ currentUserId }: TeamPageClientProps) {
  const [members, setMembers] = React.useState<TeamMember[]>([]);
  const [invitations, setInvitations] = React.useState<Array<{
    id: string;
    email: string;
    role: string;
    expires_at: string;
    created_at: string;
  }>>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const [membersRes, invitationsRes] = await Promise.all([
          fetch('/api/team/members'),
          fetch('/api/team/invitations'),
        ]);

        if (!membersRes.ok) {
          const data = await membersRes.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch members');
        }

        if (!invitationsRes.ok) {
          const data = await invitationsRes.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch invitations');
        }

        if (!cancelled) {
          const membersData = await membersRes.json();
          const invitationsData = await invitationsRes.json();
          setMembers(membersData);
          setInvitations(invitationsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load team data');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = React.useCallback(async () => {
    setError(null);
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        fetch('/api/team/members'),
        fetch('/api/team/invitations'),
      ]);

      if (!membersRes.ok || !invitationsRes.ok) {
        throw new Error('Failed to refresh');
      }

      const membersData = await membersRes.json();
      const invitationsData = await invitationsRes.json();
      setMembers(membersData);
      setInvitations(invitationsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    }
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 rounded-[28px] border border-violet-200/80 bg-[linear-gradient(135deg,rgba(248,245,255,0.95),rgba(239,248,255,0.9))] p-5 shadow-[0_20px_55px_-35px_rgba(76,29,149,0.45)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">
            <Sparkles className="h-3.5 w-3.5" />
            Team management
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.06em] text-slate-900">
            Team
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your team members and invitations.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            className="ml-2 h-8"
          >
            Retry
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Members List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-[24px] border border-violet-100 bg-white/75 p-4 shadow-[0_16px_40px_-30px_rgba(76,29,149,0.4)] sm:p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Members ({members.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                People who have access to this store.
              </p>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">Loading members...</p>
              </div>
            ) : (
              <TeamMembersTable
                members={members}
                currentUserId={currentUserId}
                onRefresh={refresh}
              />
            )}
          </div>
        </div>

        {/* Sidebar: Invite + Pending */}
        <div className="space-y-6">
          <div className="rounded-[24px] border border-violet-100 bg-white/75 p-4 shadow-[0_16px_40px_-30px_rgba(76,29,149,0.4)] sm:p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Invite people
            </h2>
            <InvitationForm onInvitationCreated={refresh} />
          </div>

          <div className="rounded-[24px] border border-violet-100 bg-white/75 p-4 shadow-[0_16px_40px_-30px_rgba(76,29,149,0.4)] sm:p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Pending invitations ({invitations.length})
            </h2>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : (
              <PendingInvitationsList invitations={invitations} onRefresh={refresh} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
