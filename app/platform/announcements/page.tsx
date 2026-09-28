import { requireSuperAdmin } from '@/lib/auth/tenant';
import { listAnnouncements } from '@/lib/announcements';
import { PlatformAnnouncementsClient } from './page-client';

export default async function PlatformAnnouncementsPage() {
  await requireSuperAdmin();

  const announcements = await listAnnouncements({
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  return <PlatformAnnouncementsClient initialAnnouncements={announcements} />;
}
