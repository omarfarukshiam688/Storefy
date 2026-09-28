import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { Announcement } from '@/types';

interface AnnouncementCardProps {
  announcement: Announcement;
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const excerpt = announcement.content.length > 140
    ? announcement.content.slice(0, 140).trimEnd() + '...'
    : announcement.content;

  const displayDate = announcement.published_at
    ? formatDistanceToNow(new Date(announcement.published_at), { addSuffix: true })
    : formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true });

  return (
    <Link
      href={`/dashboard/announcements/${announcement.id}`}
      className="group block rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] backdrop-blur-sm transition-all duration-200 hover:border-violet-200 hover:shadow-[0_22px_55px_-35px_rgba(76,29,149,0.45)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900 line-clamp-1 group-hover:text-violet-700 transition-colors">
          {announcement.title}
        </h3>
        <span className="shrink-0 text-[11px] text-slate-400">
          {displayDate}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600 line-clamp-2">
        {excerpt}
      </p>
      <div className="mt-3 flex items-center gap-1 text-xs font-medium text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity">
        Read more
        <svg
          className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
