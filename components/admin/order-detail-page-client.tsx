'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Order, OrderItem, OrderStatus, PaymentStatus } from '@/types';

interface OrderDetailPageClientProps {
  order: Order;
  items: OrderItem[];
}

const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string; disabled?: boolean }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

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

const orderStatusVariantMap: Record<OrderStatus, 'success' | 'error' | 'info' | 'warning' | 'brand' | 'neutral'> = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'brand',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'neutral',
};

const paymentStatusVariantMap: Record<PaymentStatus, 'success' | 'error' | 'info' | 'warning' | 'brand' | 'neutral'> = {
  pending: 'warning',
  paid: 'success',
  failed: 'error',
  refunded: 'brand',
};

export function OrderDetailPageClient({ order, items }: OrderDetailPageClientProps) {
  const router = useRouter();
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);

  const subtotal = order.subtotal;
  const deliveryCharge = order.delivery_charge;
  const total = subtotal + deliveryCharge;

  const availableStatuses = ORDER_STATUS_OPTIONS.filter((opt) => {
    if (opt.value === order.order_status) return true;
    return true;
  });

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error(result.error ?? 'Failed to update status');
        return;
      }

      toast.success('Order status updated');
      router.refresh();
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePaymentChange = async (newPaymentStatus: string) => {
    setIsUpdatingPayment(true);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: newPaymentStatus }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error(result.error ?? 'Failed to update payment status');
        return;
      }

      toast.success('Payment status updated');
      router.refresh();
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error(result.error ?? 'Failed to cancel order');
        return;
      }

      toast.success('Order cancelled');
      setShowCancelDialog(false);
      router.refresh();
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const timeline = [
    { label: 'Order placed', date: order.created_at },
    { label: 'Confirmed', date: order.confirmed_at },
    { label: 'Processing', date: order.processing_at },
    { label: 'Shipped', date: order.shipped_at },
    { label: 'Delivered', date: order.delivered_at },
    { label: 'Cancelled', date: order.cancelled_at },
  ].filter((item) => item.date);

  const canCancel = ['pending', 'confirmed', 'processing'].includes(order.order_status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 rounded-[28px] border border-violet-200/80 bg-[linear-gradient(135deg,rgba(248,245,255,0.95),rgba(239,248,255,0.9))] p-5 shadow-[0_20px_55px_-35px_rgba(76,29,149,0.45)] sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">
            Order details
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.06em] text-slate-900">
            {order.order_number}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Placed on {formatDate(order.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canCancel && (
            <Button
              variant="outline"
              className="h-11 border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => setShowCancelDialog(true)}
            >
              Cancel order
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Main content */}
        <div className="xl:col-span-2 space-y-6">
          {/* Order items */}
          <div className="rounded-[24px] border border-violet-100 bg-white/75 p-5 shadow-[0_16px_40px_-30px_rgba(76,29,149,0.4)] sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">Ordered Products</h2>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.product_name_snapshot}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.product_price)} x {item.quantity}
                    </p>
                  </div>
                  <span className="ml-4 font-semibold">
                    {formatCurrency(item.item_total)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery info */}
          <div className="rounded-[24px] border border-violet-100 bg-white/75 p-5 shadow-[0_16px_40px_-30px_rgba(76,29,149,0.4)] sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">Delivery Information</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
            </div>
            {order.notes && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                  Notes
                </p>
                <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Actions */}
          <div className="rounded-[24px] border border-violet-100 bg-white/75 p-5 shadow-[0_16px_40px_-30px_rgba(76,29,149,0.4)] sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">Order Status</h2>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label htmlFor="order-status-select" className="text-sm font-medium text-slate-600">Order Status</label>
                <Select
                  value={order.order_status}
                  onValueChange={handleStatusChange}
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger id="order-status-select" className="h-11 w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStatuses.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="payment-status-select" className="text-sm font-medium text-slate-600">Payment Status</label>
                <Select
                  value={order.payment_status}
                  onValueChange={handlePaymentChange}
                  disabled={isUpdatingPayment}
                >
                  <SelectTrigger id="payment-status-select" className="h-11 w-full">
                    <SelectValue placeholder="Select payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <StatusBadge variant={orderStatusVariantMap[order.order_status]}>
                  {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}
                </StatusBadge>
                <StatusBadge variant={paymentStatusVariantMap[order.payment_status]}>
                  {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                </StatusBadge>
              </div>
            </div>
          </div>

          {/* Pricing breakdown */}
          <div className="rounded-[24px] border border-violet-100 bg-white/75 p-5 shadow-[0_16px_40px_-30px_rgba(76,29,149,0.4)] sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">Pricing</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Delivery</span>
                <span className="font-medium">{formatCurrency(deliveryCharge)}</span>
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="text-base font-semibold text-slate-900">Total</span>
                <span className="text-xl font-bold tracking-[-0.03em]">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          {timeline.length > 0 && (
            <div className="rounded-[24px] border border-violet-100 bg-white/75 p-5 shadow-[0_16px_40px_-30px_rgba(76,29,149,0.4)] sm:p-6">
              <h2 className="text-lg font-semibold tracking-tight">Order Timeline</h2>
              <div className="mt-4 space-y-4">
                {timeline.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full bg-violet-600 mt-1.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel order?</DialogTitle>
            <DialogDescription>
              This will cancel order {order.order_number}. This action cannot be undone, but the order record will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={isCancelling}
              className="h-11"
            >
              Keep order
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isCancelling}
              className="h-11 bg-red-600 hover:bg-red-700"
            >
              {isCancelling ? 'Cancelling...' : 'Yes, cancel order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
