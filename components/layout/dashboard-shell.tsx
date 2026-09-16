'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from './sidebar';

interface DashboardShellProps {
  children: React.ReactNode;
  profileName?: string | null;
  storeName?: string | null;
}

export function DashboardShell({ children, profileName, storeName }: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const pageTitle = React.useMemo(() => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname.startsWith('/dashboard/products/new')) return 'New product';
    if (pathname.startsWith('/dashboard/products/')) return 'Product';
    if (pathname === '/dashboard/products') return 'Products';
    if (pathname === '/dashboard/settings') return 'Settings';
    if (pathname === '/dashboard/onboarding') return 'Onboarding';
    return 'Dashboard';
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-atmosphere-gradient-subtle noise-overlay">
      <Sidebar 
        profileName={profileName} 
        storeName={storeName}
        isOpen={sidebarOpen}
        onOpenChange={setSidebarOpen}
      />
      
      <div className="flex-1 lg:ml-[260px] flex flex-col min-h-screen min-w-0">
        <header className="sticky top-0 z-20 border-b border-border/60 bg-white/80 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold tracking-tight">{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Header actions can be added here */}
            </div>
          </div>
        </header>
        
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
