'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { OrderTable } from '@/components/admin/order-table';
import { OrderFilters } from '@/components/admin/order-filters';
import { CompactResourceUsage } from '@/components/admin/compact-resource-usage';
import { Sparkles, ShoppingCart } from 'lucide-react';
import type { Order } from '@/types';
import { OrderViewDrawer } from '@/components/admin/order-view-drawer';

interface OrdersPageClientProps {
  initialOrders: Order[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
  orderUsed?: number;
  orderLimit?: number;
}

export function OrdersPageClient({
  initialOrders,
  initialTotal,
  initialPage,
  initialTotalPages,
  orderUsed,
  orderLimit,
}: OrdersPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleCloseDrawer = () => {
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 rounded-[28px] border border-violet-200/80 bg-[linear-gradient(135deg,rgba(248,245,255,0.95),rgba(239,248,255,0.9))] p-5 shadow-[0_20px_55px_-35px_rgba(76,29,149,0.45)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">
            <Sparkles className="h-3.5 w-3.5" />
            Order management
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.06em] text-slate-900">
            Orders
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {initialTotal} {initialTotal === 1 ? 'order' : 'orders'} total
          </p>
          {orderUsed !== undefined && orderLimit !== undefined && (
            <div className="mt-3">
              <CompactResourceUsage
                title="Orders"
                icon={ShoppingCart}
                used={orderUsed}
                limit={orderLimit}
              />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[24px] border border-violet-100 bg-white/75 p-4 shadow-[0_16px_40px_-30px_rgba(76,29,149,0.4)] sm:p-5">
        <OrderFilters />
      </div>

      {/* Order Table */}
      {initialOrders.length > 0 && (
        <OrderTable
          orders={initialOrders}
          onViewOrder={handleViewOrder}
        />
      )}

      {/* Empty state */}
      {initialPage === 1 && initialOrders.length === 0 && initialTotal === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 sm:p-12 text-center">
          <p className="text-sm text-muted-foreground">No orders yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Orders will appear here when customers place them through your storefront.
          </p>
        </div>
      )}

      {/* Pagination */}
      {initialTotalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Page {initialPage} of {initialTotalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={initialPage <= 1}
              onClick={() => goToPage(initialPage - 1)}
              className="h-9"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={initialPage >= initialTotalPages}
              onClick={() => goToPage(initialPage + 1)}
              className="h-9"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Order View Drawer */}
      <OrderViewDrawer order={selectedOrder} onClose={handleCloseDrawer} />
    </div>
  );
}
