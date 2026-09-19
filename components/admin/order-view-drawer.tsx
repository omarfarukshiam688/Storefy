'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import type { Order, OrderItem } from '@/types';
import { useRouter } from 'next/navigation';

const orderStatusVariantMap: Record<string, 'success' | 'error' | 'info' | 'warning' | 'brand' | 'neutral'> = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'brand',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'neutral',
};

const paymentStatusVariantMap: Record<string, 'success' | 'error' | 'info' | 'warning' | 'brand' | 'neutral'> = {
  pending: 'warning',
  paid: 'success',
  failed: 'error',
  refunded: 'brand',
};

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function toTitleCase(value: string | undefined | null): string {
  if (!value) return 'Unknown';
  const normalized = String(value);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

interface OrderViewDrawerProps {
  order: Order | null;
  onClose: () => void;
}

export function OrderViewDrawer({ order, onClose }: OrderViewDrawerProps) {
  const [items, setItems] = React.useState<OrderItem[]>([]);
  const router = useRouter();

  const orderId = order?.id;
  const tenantId = order?.tenant_id;

  React.useEffect(() => {
    if (!orderId || !tenantId) {
      return;
    }

    let active = true;

    fetch(`/api/orders/${encodeURIComponent(orderId)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to load order');
        }
        return res.json() as Promise<Order & { items: OrderItem[] }>;
      })
      .then((data) => {
        if (active) {
          setItems(data.items ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setItems([]);
        }
      });

    return () => {
      active = false;
    };
  }, [orderId, tenantId]);

  const handleEdit = () => {
    if (!order) return;
    onClose();
    router.push(`/dashboard/orders/${order.id}`);
  };

  return (
    <div
      className={[
        'fixed inset-0 z-50',
        order ? 'visible' : 'invisible',
      ].join(' ')}
    >
      <div
        className={[
          'absolute inset-0 bg-slate-950/25 backdrop-blur-sm transition-opacity duration-300',
          order ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            onClose();
          }
        }}
        role="button"
        tabIndex={-1}
      />
      <div
        className={[
          'absolute inset-y-0 right-0 z-50 w-[92%] max-w-md border-l border-white/30 bg-white/90 shadow-2xl backdrop-blur-xl flex flex-col transition-transform duration-300 ease-out',
          order ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-slate-200/70 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Order details
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-slate-900">
              {order?.order_number ?? 'Order'}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            aria-label="Close order details"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!order ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Select an order to view details.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge variant={orderStatusVariantMap[order.order_status]}>
                  {toTitleCase(order.order_status)}
                </StatusBadge>
                <StatusBadge variant={paymentStatusVariantMap[order.payment_status]}>
                  {toTitleCase(order.payment_status)}
                </StatusBadge>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    Customer
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {order.customer_name}
                  </p>
                  <p className="text-sm text-slate-600">{order.phone_number}</p>
                  {order.customer_email && (
                    <p className="text-sm text-slate-600">{order.customer_email}</p>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    Delivery address
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {order.district}
                  </p>
                  <p className="text-sm text-slate-600">{order.delivery_address}</p>
                </div>
                {order.notes && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                      Notes
                    </p>
                    <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{order.notes}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Ordered products
                </p>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items found.</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{item.product_name_snapshot}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.product_price)} x {item.quantity}
                          </p>
                        </div>
                        <span className="ml-3 text-sm font-semibold whitespace-nowrap">
                          {formatCurrency(item.item_total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Delivery</span>
                  <span className="font-medium">{formatCurrency(order.delivery_charge)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                  <span className="text-base font-semibold text-slate-900">Total</span>
                  <span className="text-base font-bold">
                    {formatCurrency(order.subtotal + order.delivery_charge)}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Timeline
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Order placed', date: order.created_at },
                    { label: 'Confirmed', date: order.confirmed_at },
                    { label: 'Processing', date: order.processing_at },
                    { label: 'Shipped', date: order.shipped_at },
                    { label: 'Delivered', date: order.delivered_at },
                    { label: 'Cancelled', date: order.cancelled_at },
                  ]
                    .filter((item) => item.date)
                    .map((item, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex h-2 w-2 shrink-0 items-center justify-center rounded-full bg-violet-600 mt-1.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {order && (
          <div className="border-t border-slate-200/70 p-5">
            <Button className="w-full" onClick={handleEdit}>
              Open full order page
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
