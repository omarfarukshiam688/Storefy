'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Settings,
  X,
  ChevronRight,
  Sparkles,
  LayoutGrid,
  ShoppingCart,
  Users,
  UserPlus,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/components/auth/sign-out-button';

interface SidebarProps {
  profileName?: string | null;
  storeName?: string | null;
  role?: 'tenant_admin' | 'tenant_staff' | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/products', label: 'Products', icon: Package },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/dashboard/storefront', label: 'Storefront', icon: LayoutGrid },
];

const adminNavItems = [
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/team', label: 'Team', icon: UserPlus },
  { href: '/dashboard/reviews', label: 'Reviews', icon: MessageSquare },
];

function NavContent({
  profileName,
  storeName,
  role,
  onNavigate,
}: {
  profileName?: string | null;
  storeName?: string | null;
  role?: 'tenant_admin' | 'tenant_staff' | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <div className="flex items-center px-5 py-5">
        <div className="relative h-[130px] w-48 overflow-hidden bg-transparent sm:h-[140px] sm:w-52">
          <Image
            src="/storefy-LOGO.png"
            alt="Storefy logo"
            width={220}
            height={100}
            className="h-full w-full object-contain"
            priority
          />
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-violet-100/80 text-violet-700 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.12)]'
                  : 'text-slate-600 hover:bg-violet-50 hover:text-slate-900'
              )}
            >
              {active && (
                <span className="absolute left-0 top-3 h-7 w-1 rounded-r-full bg-violet-600" />
              )}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl border transition-colors',
                  active
                    ? 'border-violet-200 bg-white text-violet-700'
                    : 'border-slate-200 bg-slate-50 text-slate-500 group-hover:border-violet-200 group-hover:text-violet-700'
                )}
              >
                <item.icon className="h-4 w-4" />
              </div>
              <span>{item.label}</span>
              {active && (
                <ChevronRight className="ml-auto h-4 w-4 opacity-80" />
              )}
            </Link>
          );
        })}
        {role === 'tenant_admin' &&
          adminNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-violet-100/80 text-violet-700 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.12)]'
                    : 'text-slate-600 hover:bg-violet-50 hover:text-slate-900'
                )}
              >
                {active && (
                  <span className="absolute left-0 top-3 h-7 w-1 rounded-r-full bg-violet-600" />
                )}
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-xl border transition-colors',
                    active
                      ? 'border-violet-200 bg-white text-violet-700'
                      : 'border-slate-200 bg-slate-50 text-slate-500 group-hover:border-violet-200 group-hover:text-violet-700'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </div>
                <span>{item.label}</span>
                {active && (
                  <ChevronRight className="ml-auto h-4 w-4 opacity-80" />
                )}
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-violet-100/80 p-3">
        <div className="rounded-2xl border border-violet-100 bg-white/80 p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-500 text-xs font-semibold text-white">
              {(profileName ?? 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {profileName ?? 'User'}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {storeName ?? 'Store'}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-2.5 py-2">
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-violet-600" />
              Account
            </div>
            <SignOutButton showLabel={false} />
          </div>
        </div>
      </div>
    </>
  );
}

export function Sidebar({
  profileName,
  storeName,
  role,
  isOpen,
  onOpenChange,
}: SidebarProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const pathname = usePathname();

  const open = isOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:h-[100dvh] lg:w-[280px] lg:flex-col lg:border-r lg:border-violet-200 lg:bg-[linear-gradient(180deg,rgba(225,218,255,0.97),rgba(205,225,255,0.96))] lg:backdrop-blur-xl">
        <NavContent profileName={profileName} storeName={storeName} role={role} />
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
              setOpen(false);
            }
          }}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-violet-200 bg-[linear-gradient(180deg,rgba(225,218,255,0.98),rgba(205,225,255,0.97))] backdrop-blur-xl shadow-2xl transition-transform duration-300 ease-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-violet-100 px-5 py-5">
          <div className="flex items-center">
            <div className="relative h-20 w-32 overflow-hidden bg-transparent sm:h-[100px] sm:w-36">
              <Image
                src="/storefy-LOGO.png"
                alt="Storefy logo"
                width={200}
                height={100}
                className="h-full w-full object-contain"
                priority
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-violet-100/80 text-violet-700 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.12)]'
                    : 'text-slate-600 hover:bg-violet-50 hover:text-slate-900'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-xl border',
                    isActive
                      ? 'border-violet-200 bg-white text-violet-700'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </div>
                {item.label}
              </Link>
            );
          })}
          {role === 'tenant_admin' &&
            adminNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-violet-100/80 text-violet-700 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.12)]'
                      : 'text-slate-600 hover:bg-violet-50 hover:text-slate-900'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-xl border',
                      isActive
                        ? 'border-violet-200 bg-white text-violet-700'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </div>
                  {item.label}
                </Link>
              );
            })}
        </nav>
        <div className="border-t border-violet-100/80 p-3">
          <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white/80 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-500 text-xs font-semibold text-white">
              {(profileName ?? 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {profileName ?? 'User'}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {storeName ?? 'Store'}
              </p>
            </div>
            <SignOutButton showLabel={false} />
          </div>
        </div>
      </aside>
    </>
  );
}
