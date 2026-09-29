'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Notification } from '@/types';

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

function getNotificationHref(notification: Notification): string {
  switch (notification.target_type) {
    case 'order':
      return `/dashboard/orders/${notification.target_id}`;
    case 'review':
      return `/dashboard/reviews`;
    case 'announcement':
      return `/dashboard/announcements`;
    default:
      return '/dashboard';
  }
}

export function NotificationCenterClient({ initialPage = 1 }: { initialPage?: number }) {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [page, setPage] = React.useState(initialPage);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [markingAllRead, setMarkingAllRead] = React.useState(false);

  const fetchNotifications = React.useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?page=${pageNum}&page_size=15`);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setTotalPages(data.total_pages ?? 1);
      setTotal(data.total ?? 0);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    fetchNotifications(page);
  }, [page, fetchNotifications]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleMarkRead = async (notification: Notification) => {
    if (notification.read_at) return;
    try {
      const res = await fetch(`/api/notifications/${notification.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      const res = await fetch(`/api/notifications`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch {
      // silent
    } finally {
      setMarkingAllRead(false);
    }
  };

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markingAllRead}
          >
            {markingAllRead ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Mark all as read'
            )}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-violet-50/60" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-violet-100 bg-white/80 p-10 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700">
            <Bell className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">No new notifications</h3>
          <p className="mt-1.5 text-sm text-slate-500">You are all caught up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const isUnread = !notification.read_at;
            const href = getNotificationHref(notification);

            return (
              <Link
                key={notification.id}
                href={href}
                onClick={async () => {
                  await handleMarkRead(notification);
                }}
                className={`flex items-start gap-4 rounded-xl border border-violet-100 bg-white/80 p-4 shadow-sm transition-all hover:border-violet-200 hover:shadow-md ${
                  isUnread ? 'border-l-4 border-l-violet-600' : ''
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isUnread ? (
                    <span className="flex h-2.5 w-2.5 rounded-full bg-violet-600" />
                  ) : (
                    <span className="flex h-2.5 w-2.5 rounded-full bg-slate-200" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                    {notification.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{notification.message}</p>
                  <p className="mt-2 text-xs text-slate-400">{timeAgo(notification.created_at)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-violet-100 pt-4">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, total)} of {total} notifications
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
