'use client';

import Link from 'next/link';
import { Play, Youtube, Facebook, Calendar, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { BlogCategoryWithContent } from '@/lib/resource-center';

interface BlogVideosTabProps {
  categories: BlogCategoryWithContent[];
}

export function BlogVideosTab({ categories }: BlogVideosTabProps) {
  const allVideos = categories.flatMap((cat) =>
    cat.videos.map((video) => ({ ...video, categoryName: cat.name, categorySlug: cat.slug }))
  );

  if (allVideos.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700 mb-4">
          <Play className="h-8 w-8" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">No videos yet</h3>
        <p className="mt-2 text-sm text-slate-500">Video tutorials will appear here once published.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {allVideos.map((video) => (
          <Link
            key={video.id}
            href={video.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-2xl border border-violet-100 bg-white/80 overflow-hidden shadow-sm transition-all hover:border-violet-200 hover:shadow-lg"
          >
            <div className="relative aspect-video overflow-hidden">
              <img
                src={video.thumbnail_path}
                alt=""
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="h-12 w-12 text-white" aria-hidden="true" />
              </div>
              <div className="absolute top-3 right-3 flex gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    video.video_platform === 'youtube'
                      ? 'bg-red-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {video.video_platform === 'youtube' ? <Youtube className="h-3 w-3" /> : <Facebook className="h-3 w-3" />}
                </span>
              </div>
            </div>

            <div className="p-4 space-y-2">
              <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-violet-700 transition-colors">
                {video.title}
              </h3>

              {video.description && (
                <p className="text-sm text-slate-600 line-clamp-2">{video.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" aria-hidden="true" />
                  {video.categoryName}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  {formatDistanceToNow(new Date(video.published_at ?? video.created_at), { addSuffix: true })}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-violet-100">
                <span className="text-xs font-medium text-violet-700">
                  Watch on {video.video_platform.charAt(0).toUpperCase() + video.video_platform.slice(1)}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-violet-600 group-hover:gap-2 transition-all">
                  <Play className="h-3 w-3" aria-hidden="true" />
                  Watch
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}