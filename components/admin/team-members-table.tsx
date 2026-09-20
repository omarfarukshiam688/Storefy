'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MoreHorizontal, Shield, ShieldCheck, UserMinus } from 'lucide-react';
import type { TeamMember } from '@/lib/team';

interface TeamMembersTableProps {
  members: TeamMember[];
  currentUserId: string;
  onRefresh: () => void;
}

const roleVariantMap: Record<string, 'success' | 'info' | 'brand' | 'neutral'> = {
  tenant_admin: 'success',
  tenant_staff: 'info',
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

export function TeamMembersTable({ members, currentUserId, onRefresh }: TeamMembersTableProps) {
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = React.useState(false);
  const [memberToRemove, setMemberToRemove] = React.useState<TeamMember | null>(null);
  const [removeConfirm, setRemoveConfirm] = React.useState('');
  const [updatingRoleId, setUpdatingRoleId] = React.useState<string | null>(null);

  const handleRemoveClick = (member: TeamMember) => {
    setMemberToRemove(member);
    setRemoveConfirm('');
    setShowRemoveDialog(true);
  };

  const handleRemoveConfirm = async () => {
    if (!memberToRemove || removeConfirm.trim().toLowerCase() !== 'remove') {
      toast.error('Please type "remove" to confirm');
      return;
    }

    setRemovingId(memberToRemove.id);
    try {
      const response = await fetch(`/api/team/members/${memberToRemove.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || 'Failed to remove member');
        return;
      }

      toast.success('Member removed');
      setShowRemoveDialog(false);
      setMemberToRemove(null);
      setRemoveConfirm('');
      onRefresh();
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setUpdatingRoleId(memberId);
    try {
      const response = await fetch(`/api/team/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || 'Failed to update role');
        return;
      }

      toast.success('Role updated');
      onRefresh();
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
        <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-4 text-sm font-medium text-slate-900">No team members yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Invite team members using the form above.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {member.profile?.name ?? 'Unknown User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {member.profile?.email ?? 'No email'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge variant={roleVariantMap[member.role]}>
                    {member.role.replace('tenant_', '')}
                  </StatusBadge>
                  {member.user_id === currentUserId && (
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      You
                    </span>
                  )}
                </div>
              </div>
              {member.user_id !== currentUserId && (
                <MemberActions
                  member={member}
                  onRemove={handleRemoveClick}
                  onRoleChange={handleRoleChange}
                  updatingRoleId={updatingRoleId}
                />
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Joined {formatDate(member.created_at)}
            </p>
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
                  Member
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Email
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Role
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Last Login
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Joined
                </th>
                <th className="h-12 px-6 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Actions
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
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {member.profile?.name ?? 'Unknown User'}
                      </span>
                      {member.user_id === currentUserId && (
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      {member.profile?.email ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {member.user_id === currentUserId ? (
                      <StatusBadge variant={roleVariantMap[member.role]}>
                        {member.role.replace('tenant_', '')}
                      </StatusBadge>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-slate-600 hover:bg-violet-50 hover:text-violet-700"
                            disabled={updatingRoleId === member.id}
                          >
                            <StatusBadge variant={roleVariantMap[member.role]}>
                              {member.role.replace('tenant_', '')}
                            </StatusBadge>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuLabel>Change role</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.id, 'tenant_admin')}
                            className="gap-2"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.id, 'tenant_staff')}
                            className="gap-2"
                          >
                            <Shield className="h-4 w-4" />
                            Staff
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      {member.last_login_at
                        ? formatDate(member.last_login_at)
                        : 'Never'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(member.created_at)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {member.user_id !== currentUserId && (
                      <MemberActions
                        member={member}
                        onRemove={handleRemoveClick}
                        onRoleChange={handleRoleChange}
                        updatingRoleId={updatingRoleId}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remove Member Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove team member?</DialogTitle>
            <DialogDescription>
              This will remove {memberToRemove?.profile?.name ?? 'this user'} from the
              team. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="remove-confirm-input">
              Type &quot;remove&quot; to confirm
            </Label>
            <Input
              id="remove-confirm-input"
              value={removeConfirm}
              onChange={(e) => setRemoveConfirm(e.target.value)}
              placeholder="remove"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRemoveDialog(false);
                setMemberToRemove(null);
                setRemoveConfirm('');
              }}
              disabled={removingId !== null}
              className="h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemoveConfirm}
              disabled={removingId !== null || removeConfirm.trim().toLowerCase() !== 'remove'}
              className="h-11 bg-red-600 hover:bg-red-700"
            >
              {removingId ? 'Removing...' : 'Remove member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MemberActions({
  member,
  onRemove,
  onRoleChange,
  updatingRoleId,
}: {
  member: TeamMember;
  onRemove: (member: TeamMember) => void;
  onRoleChange: (memberId: string, role: string) => void;
  updatingRoleId: string | null;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
            aria-label={`Actions for ${member.profile?.name ?? 'member'}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onRoleChange(member.id, 'tenant_admin')}
            className="gap-2"
            disabled={updatingRoleId === member.id}
          >
            <ShieldCheck className="h-4 w-4" />
            Make Admin
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onRoleChange(member.id, 'tenant_staff')}
            className="gap-2"
            disabled={updatingRoleId === member.id}
          >
            <Shield className="h-4 w-4" />
            Make Staff
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onRemove(member)}
            className="gap-2 text-red-600 focus:text-red-600"
          >
            <UserMinus className="h-4 w-4" />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
