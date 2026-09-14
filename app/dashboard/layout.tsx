import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/auth/session';

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

  return <>{children}</>;
}
