import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/auth/session';
import { getTenantContext } from '@/lib/auth/tenant';
import { userHasTenant } from '@/lib/tenants';

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

  // Check if user has a tenant
  try {
    const hasTenant = await userHasTenant(user.id);
    if (!hasTenant) {
      redirect('/dashboard/onboarding');
    }
  } catch {
    redirect('/login');
  }

  try {
    await getTenantContext();
  } catch {
    redirect('/login');
  }

  return <>{children}</>;
}
