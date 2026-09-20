import { Suspense } from 'react';
import AcceptInvitationClient from './accept-invitation-client';

export const dynamic = 'force-dynamic';

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="w-full max-w-md text-center">
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    }>
      <AcceptInvitationClient />
    </Suspense>
  );
}
