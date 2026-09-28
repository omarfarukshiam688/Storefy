'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Megaphone, Trash2, Plus, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Announcement } from '@/types';

interface PlatformAnnouncementsClientProps {
  initialAnnouncements: Announcement[];
}

export function PlatformAnnouncementsClient({
  initialAnnouncements,
}: PlatformAnnouncementsClientProps) {
  const [announcements, setAnnouncements] = React.useState<Announcement[]>(initialAnnouncements);
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const deleteAnnouncement = announcements.find((a) => a.id === deleteId);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch('/api/platform/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), is_published: true }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error(result.error ?? 'Failed to publish announcement');
        return;
      }

      const newAnnouncement = (await response.json()) as Announcement;
      setAnnouncements((prev) => [newAnnouncement, ...prev]);
      setTitle('');
      setContent('');
      toast.success('Announcement published');
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteClick = (announcement: Announcement) => {
    setDeleteId(announcement.id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/platform/announcements/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error(result.error ?? 'Failed to delete announcement');
        return;
      }

      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteId));
      setDeleteId(null);
      toast.success('Announcement deleted');
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trimEnd() + '...';
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 rounded-[28px] border border-violet-200/80 bg-[linear-gradient(135deg,rgba(248,245,255,0.95),rgba(239,248,255,0.9))] p-5 shadow-[0_20px_55px_-35px_rgba(76,29,149,0.45)] sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">
            <Megaphone className="h-3.5 w-3.5" />
            Announcements
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.06em] text-slate-900">
            Manage Announcements
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Publish updates that appear in every tenant dashboard.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <form onSubmit={handlePublish} className="rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">New Announcement</h2>
              <p className="mt-1 text-xs text-slate-500">
                Write your message and publish it to all tenants.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="title" className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1.5">
                  Title
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement title"
                  className="h-11"
                  maxLength={255}
                />
              </div>

              <div>
                <label htmlFor="content" className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1.5">
                  Content
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your announcement..."
                  rows={6}
                  maxLength={10000}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="mt-1 text-[11px] text-slate-400 text-right">
                  {content.length}/10000
                </p>
              </div>

              <Button
                type="submit"
                disabled={isPublishing || !title.trim() || !content.trim()}
                className="w-full h-11 bg-violet-600 shadow-[0_10px_24px_-12px_rgba(124,58,237,0.8)] hover:bg-violet-700"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Publish Announcement
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              {announcements.length} {announcements.length === 1 ? 'announcement' : 'announcements'}
            </h2>
          </div>

          {announcements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/30 p-8 sm:p-12 text-center">
              <Megaphone className="h-12 w-12 mx-auto text-violet-300 mb-4" />
              <h3 className="text-base font-semibold mb-1 text-slate-900">No announcements yet</h3>
              <p className="text-sm text-slate-500">
                Create your first announcement to notify all tenants.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">
                          {announcement.title}
                        </h3>
                        <StatusBadge variant={announcement.is_published ? 'success' : 'neutral'}>
                          {announcement.is_published ? 'Published' : 'Draft'}
                        </StatusBadge>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {truncate(announcement.content, 180)}
                      </p>
                      <p className="mt-2 text-[11px] text-slate-400">
                        {announcement.is_published && announcement.published_at
                          ? `Published ${formatDistanceToNow(new Date(announcement.published_at), { addSuffix: true })}`
                          : `Created ${formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(announcement)}
                      className="h-9 w-9 shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${announcement.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {deleteAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 backdrop-blur-[2px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-900">Delete announcement?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently remove{' '}
              <span className="font-semibold">{deleteAnnouncement.title}</span>. This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteId(null)}
                disabled={isDeleting}
                className="h-11"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="h-11 bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? 'Deleting...' : 'Delete permanently'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
