import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/auth/session';
import { getTenantContext } from '@/lib/auth/tenant';
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

  const context = await getTenantContext();

  return (
    <DashboardShell
      profileName={context.profile.name}
      storeName={context.activeTenant?.name ?? null}
    >
      {children}
    </DashboardShell>
  );
}
