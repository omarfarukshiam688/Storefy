'use client';

import * as React from 'react';
import { CartProvider } from '@/lib/cart/cart-context';
import { StoreHeader } from './store-header';
import { StoreFooter } from './store-footer';
import { PageTransition } from './page-transition';
import { CartDrawer } from './cart-drawer';
import type { Tenant } from '@/types';

export default function StorefrontClientWrapper({
  children,
  tenantId,
  tenantSlug,
  storeName,
  logoUrl,
  primaryColor,
  tenant,
}: {
  children: React.ReactNode;
  tenantId: string;
  tenantSlug: string;
  storeName: string;
  logoUrl: string | null;
  primaryColor: string;
  tenant: Tenant;
}) {
  return (
    <CartProvider tenantId={tenantId} tenantSlug={tenantSlug}>
      <div
        className="min-h-screen bg-white text-slate-900"
        style={{ '--brand-primary': primaryColor } as React.CSSProperties}
      >
        <StoreHeader storeName={storeName} logoUrl={logoUrl} primaryColor={primaryColor} tenant={tenant} />
        <main className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <StoreFooter tenant={tenant} />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
