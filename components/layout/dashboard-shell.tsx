'use client';

import * as React from 'react';
import { Bell, Menu, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from './sidebar';

interface DashboardShellProps {
  children: React.ReactNode;
  profileName?: string | null;
  storeName?: string | null;
}

export function DashboardShell({
  children,
  profileName,
  storeName,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.14),_transparent_28%),linear-gradient(180deg,#edf6ff_0%,#f5f7fb_100%)]">
      <div className="flex h-full w-full overflow-hidden">
        <Sidebar
          profileName={profileName}
          storeName={storeName}
          isOpen={sidebarOpen}
          onOpenChange={setSidebarOpen}
        />

        <div className="flex min-w-0 flex-1 flex-col lg:pl-[280px]">
          <header className="sticky top-0 z-20 shrink-0 border-b border-violet-100/80 bg-white/60 backdrop-blur-xl">
            <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-slate-700 lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="hidden items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700/80 md:flex">
                  <Sparkles className="h-3.5 w-3.5" />
                  Workspace
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-violet-100 bg-violet-50/60 px-3 py-2 text-sm text-slate-500 md:flex">
                  <Search className="h-4 w-4 text-violet-600" />
                  <span>Search</span>
                </div>
                <button
                  type="button"
                  aria-label="Notifications"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-100 bg-white/70 text-slate-700 shadow-sm transition-colors hover:border-violet-200 hover:text-violet-700"
                >
                  <Bell className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3 rounded-full border border-violet-100 bg-white/80 px-2.5 py-1.5 shadow-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-500 text-xs font-semibold text-white">
                    {(profileName ?? 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-semibold text-slate-800">
                      {profileName ?? 'User'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {storeName ?? 'Store'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
