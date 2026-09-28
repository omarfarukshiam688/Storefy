import { listAnnouncements } from '@/lib/announcements';
import { AnnouncementCard } from './announcement-card';
import { Sparkles, Megaphone } from 'lucide-react';

export default async function DashboardAnnouncementsPage() {
  const announcements = await listAnnouncements({
    is_published: true,
    sort_by: 'published_at',
    sort_order: 'desc',
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">
          <Sparkles className="h-3.5 w-3.5" />
          Announcements
        </div>
        <h1 className="text-3xl font-bold tracking-[-0.06em] text-slate-900">
          Announcements
        </h1>
        <p className="text-sm text-slate-600">
          Latest updates from the Storefy team.
        </p>
      </div>

      {announcements.length === 0 ? (
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-violet-100 bg-white/80 p-6 text-center shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] backdrop-blur-sm transition-all duration-200 hover:shadow-[0_22px_55px_-35px_rgba(76,29,149,0.45)] hover:-translate-y-0.5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700">
              <Megaphone className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">No announcements yet</h3>
            <p className="mt-1.5 text-sm text-slate-500">When there is something new, you will see it here.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {announcements.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))}
        </div>
      )}
    </div>
  );
}
