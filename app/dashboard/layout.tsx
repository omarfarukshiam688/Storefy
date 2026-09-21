import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/auth/session';
import { getTenantContext } from '@/lib/auth/tenant';
import { ForbiddenError } from '@/lib/auth/errors';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user;
  try {
    user = await requireAuthUser();
  } catch {
    redirect('/login');
  }

  if (!user.email_confirmed_at) {
    redirect('/verify-email');
  }

  let context;
  try {
    context = await getTenantContext();
  } catch (error) {
    if (error instanceof ForbiddenError) {
      redirect('/login');
    }
    throw error;
  }

  return (
    <DashboardShell
      profileName={context.profile.name}
      storeName={context.activeTenant?.name ?? null}
      role={context.role}
    >
      {children}
    </DashboardShell>
  );
}
