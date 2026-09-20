'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from 'sonner';
import { Trash2, Mail } from 'lucide-react';

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

interface PendingInvitationsListProps {
  invitations: PendingInvitation[];
  onRefresh: () => void;
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

export function PendingInvitationsList({ invitations, onRefresh }: PendingInvitationsListProps) {
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);

  const handleCancel = async (invitationId: string) => {
    setCancellingId(invitationId);
    try {
      const response = await fetch(`/api/team/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || 'Failed to cancel invitation');
        return;
      }

      toast.success('Invitation cancelled');
      onRefresh();
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  if (invitations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
        <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium text-slate-900">No pending invitations</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Invitations will appear here until they are accepted or expire.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-white/70 p-4 shadow-sm shadow-black/[0.02] backdrop-blur-sm"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-900 truncate">
                {invitation.email}
              </p>
              <StatusBadge variant="brand">
                {invitation.role.replace('tenant_', '')}
              </StatusBadge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Sent {formatDate(invitation.created_at)} · Expires{' '}
              {formatDate(invitation.expires_at)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-slate-500 hover:bg-red-50 hover:text-red-700"
            onClick={() => handleCancel(invitation.id)}
            disabled={cancellingId === invitation.id}
            aria-label={`Cancel invitation to ${invitation.email}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
