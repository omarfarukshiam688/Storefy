import { redirect } from 'next/navigation';
import { getTenantContext } from '@/lib/auth/tenant';
import { TeamPageClient } from '@/components/admin/team-page-client';

export default async function TeamPage() {
  const context = await getTenantContext();

  if (!context.activeTenant) {
    redirect('/dashboard/onboarding');
  }

  if (context.role !== 'tenant_admin') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            Team
          </h1>
          <p className="text-destructive">
            Only store administrators can manage team members.
          </p>
        </div>
      </div>
    );
  }

  return <TeamPageClient tenantId={context.activeTenant.id} currentUserId={context.profile.id} />;
}
