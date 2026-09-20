'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Sparkles, Mail, Store, Calendar, ShieldCheck, ShieldX } from 'lucide-react';

export default function AcceptInvitationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = React.useState(true);
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [invitation, setInvitation] = React.useState<{
    id: string;
    tenant_id: string;
    email: string;
    role: string;
    expires_at: string;
    accepted_at: string | null;
    tenant: { name: string; slug: string } | null;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchInvitation() {
      if (!token) {
        setError('Missing invitation token');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/team/invitations/validate?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid invitation');
          setIsLoading(false);
          return;
        }

        setInvitation(data);
      } catch {
        setError('Failed to load invitation');
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;

    setIsAccepting(true);
    try {
      const response = await fetch('/api/team/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to accept invitation');
        return;
      }

      toast.success('Invitation accepted! Welcome to the team.');
      router.push('/dashboard');
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="w-full max-w-md text-center">
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldX className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Invalid Invitation
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error || 'This invitation link is invalid or has expired.'}
          </p>
          <div className="mt-8">
            <Button
              onClick={() => router.push('/dashboard')}
              className="h-11"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (invitation.accepted_at) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Already Accepted
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invitation has already been accepted.
          </p>
          <div className="mt-8">
            <Button
              onClick={() => router.push('/dashboard')}
              className="h-11"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = new Date(invitation.expires_at) < new Date();

  if (isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Calendar className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Invitation Expired
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invitation expired on{' '}
            {new Date(invitation.expires_at).toLocaleDateString()}.
          </p>
          <div className="mt-8">
            <Button
              onClick={() => router.push('/dashboard')}
              className="h-11"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            You&apos;re invited!
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;ve been invited to join a team on Storefy.
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {invitation.tenant?.name ?? 'Unknown Store'}
              </p>
              <p className="text-xs text-muted-foreground">
                /{invitation.tenant?.slug ?? ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                {invitation.email}
              </p>
              <p className="text-xs text-muted-foreground">Invited email</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 capitalize">
                {invitation.role.replace('tenant_', '')}
              </p>
              <p className="text-xs text-muted-foreground">Role</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                Expires {new Date(invitation.expires_at).toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground">Expiration date</p>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleAccept}
              disabled={isAccepting}
              className="w-full h-11"
            >
              {isAccepting ? 'Accepting...' : 'Accept Invitation'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
