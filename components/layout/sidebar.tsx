'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Settings,
  Store,
  X,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/components/auth/sign-out-button';

interface SidebarProps {
  profileName?: string | null;
  storeName?: string | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/products', label: 'Products', icon: Package },
  { href: '/dashboard/products/new', label: 'Add product', icon: Package },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

function NavContent({ profileName, storeName, onNavigate }: { profileName?: string | null; storeName?: string | null; onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Store className="h-4 w-4" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Storefy</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative',
                active
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary" />
              )}
              <item.icon className="h-4 w-4" />
              {item.label}
              {active && (
                <ChevronRight className="ml-auto h-4 w-4 opacity-60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User / Account */}
      <div className="border-t border-border/60 p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {(profileName ?? 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profileName ?? 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{storeName ?? 'Store'}</p>
          </div>
          <SignOutButton showLabel={false} />
        </div>
      </div>
    </>
  );
}

export function Sidebar({ profileName, storeName, isOpen, onOpenChange }: SidebarProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const pathname = usePathname();
  
  const open = isOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-[260px] lg:flex-col border-r border-border/60 bg-white/80 backdrop-blur-xl z-30">
        <NavContent profileName={profileName} storeName={storeName} />
      </aside>

      {/* Mobile Overlay */}
      {open && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-fade-in" 
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

      {/* Mobile Drawer */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 flex flex-col w-[280px] border-r border-border/60 bg-white/95 backdrop-blur-xl shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Store className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Storefy</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border/60 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {(profileName ?? 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profileName ?? 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{storeName ?? 'Store'}</p>
            </div>
            <SignOutButton showLabel={false} />
          </div>
        </div>
      </aside>
    </>
  );
}
