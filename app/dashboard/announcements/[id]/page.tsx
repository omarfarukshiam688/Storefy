import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAnnouncement } from '@/lib/announcements';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default async function DashboardAnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let announcement;
  try {
    announcement = await getAnnouncement(id);
  } catch {
    notFound();
  }

  if (!announcement.is_published) {
    notFound();
  }

  const displayDate = announcement.published_at
    ? formatDistanceToNow(new Date(announcement.published_at), { addSuffix: true })
    : formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-9 w-9 text-slate-500 hover:text-violet-700"
        >
          <Link href="/dashboard/announcements">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">
            <Sparkles className="h-3.5 w-3.5" />
            Announcements
          </div>
          <h1 className="text-2xl font-bold tracking-[-0.05em] text-slate-900">
            {announcement.title}
          </h1>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white/80 p-6 sm:p-8 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] backdrop-blur-sm">
        <p className="text-xs text-slate-400 mb-4">{displayDate}</p>
        <div className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">
          {announcement.content}
        </div>
      </div>
    </div>
  );
}
