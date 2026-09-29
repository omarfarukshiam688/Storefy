'use client';

import * as React from 'react';
import { Bell, CheckCheck, ExternalLink, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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

export function NotificationCenter() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [markingAllRead, setMarkingAllRead] = React.useState(false);

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?page=1&page_size=15`);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?page=1&page_size=1`);
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      // silent
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    const href = getNotificationHref(notification);

    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch(`/api/notifications/${notification.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete notification');
      }

      router.push(href);
    } catch {
      setNotifications((prev) => {
        const exists = prev.some((n) => n.id === notification.id);
        if (!exists) {
          return [...prev, notification];
        }
        return prev;
      });
      setUnreadCount((prev) => prev + 1);
      toast.error('Failed to remove notification');
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
        toast.success('All notifications cleared');
      } else {
        throw new Error('Failed to clear notifications');
      }
    } catch {
      toast.error('Failed to clear notifications');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const displayCount = unreadCount > 9 ? '9+' : unreadCount.toString();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-violet-100 bg-white/70 text-slate-700 shadow-sm transition-colors hover:border-violet-200 hover:text-violet-700"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
              {displayCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-2rem)] max-w-sm p-0"
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between border-b border-violet-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleMarkAllRead}
              disabled={markingAllRead}
            >
              {markingAllRead ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <CheckCheck className="mr-1 h-3.5 w-3.5" />
                  Mark all
                </>
              )}
            </Button>
          )}
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-violet-50/60" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-900">No new notifications</p>
              <p className="mt-1 text-xs text-slate-500">You are all caught up.</p>
            </div>
          ) : (
            <div className="divide-y divide-violet-50">
              {notifications.map((notification) => {
                const isUnread = !notification.read_at;
                const href = getNotificationHref(notification);

                return (
                  <a
                    key={notification.id}
                    href={href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNotificationClick(notification);
                      router.push(href);
                    }}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-violet-50 ${
                      isUnread ? 'bg-violet-50/40' : ''
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isUnread ? (
                        <span className="flex h-2 w-2 rounded-full bg-violet-600" />
                      ) : (
                        <span className="flex h-2 w-2 rounded-full bg-transparent" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {notification.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{notification.message}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{timeAgo(notification.created_at)}</p>
                    </div>
                    <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="border-t border-violet-100 px-4 py-2 text-center">
            <a
              href="/dashboard/notifications"
              className="text-xs font-medium text-violet-700 hover:text-violet-800"
            >
              View all notifications
            </a>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
