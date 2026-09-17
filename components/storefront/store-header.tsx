'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface StoreHeaderProps {
  storeName: string;
  logoUrl?: string | null;
}

export function StoreHeader({ storeName, logoUrl }: StoreHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: '.', label: 'Home' },
    { href: './products', label: 'Products' },
    { href: './categories', label: 'Categories' },
  ];

  const isActive = (href: string) => {
    if (href === '.') {
      return pathname === '/' || pathname.endsWith('/products') || pathname.endsWith('/categories');
    }
    return pathname.includes(href.replace('./', ''));
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={storeName}
              className="h-9 w-auto object-contain"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-sky-500 text-white shadow-sm">
              <Store className="h-5 w-5" />
            </div>
          )}
          <span className="text-lg font-semibold tracking-[-0.03em] text-slate-900 sm:text-xl">
            {storeName}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-medium transition-colors',
                isActive(link.href)
                  ? 'text-violet-700'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/25 backdrop-blur-sm md:hidden">
          <div className="absolute inset-y-0 right-0 w-[82%] max-w-sm border-l border-white/30 bg-white/90 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between pb-4">
              <span className="text-lg font-semibold tracking-[-0.03em] text-slate-900">
                Menu
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <nav className="mt-8 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'flex items-center justify-between rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive(link.href)
                      ? 'border-violet-200 bg-violet-50 text-violet-700'
                      : 'text-slate-700 hover:border-violet-200 hover:bg-violet-50'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
