import { redirect } from 'next/navigation';
import { getTenantContext } from '@/lib/auth/tenant';
import { NotificationCenterClient } from '@/components/dashboard/notification-center-client';

export default async function DashboardNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getTenantContext();

  if (!context.activeTenant) {
    redirect('/dashboard/onboarding');
  }

  const resolvedParams = await searchParams;
  const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">
          Notifications
        </div>
        <h1 className="text-3xl font-bold tracking-[-0.06em] text-slate-900">
          Notifications
        </h1>
        <p className="text-sm text-slate-600">
          Stay up to date with your store activity.
        </p>
      </div>
      <NotificationCenterClient initialPage={page} />
    </div>
  );
}
