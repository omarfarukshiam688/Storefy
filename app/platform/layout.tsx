import { redirect } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth/tenant';
import { PlatformShell } from '@/components/platform/platform-shell';

export default async function PlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user;
  try {
    user = await requireSuperAdmin();
  } catch {
    redirect('/login');
  }

  return (
    <PlatformShell profileName={user.user_metadata?.full_name ?? user.email}>
      {children}
    </PlatformShell>
  );
}
