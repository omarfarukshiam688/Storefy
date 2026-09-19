'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Eye, Pencil, XCircle } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Order, OrderStatus, PaymentStatus } from '@/types';

interface OrderTableProps {
  orders: Order[];
  onViewOrder: (order: Order) => void;
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

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string) {
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

export function OrderTable({ orders, onViewOrder }: OrderTableProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
        <p className="text-sm text-muted-foreground">No orders found</p>
        <p className="text-xs text-muted-foreground mt-1">
          Try adjusting your filters or search.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/dashboard/orders/${order.id}`}
                  className="font-mono text-sm font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {order.order_number}
                </Link>
                <p className="text-sm font-medium text-slate-900 mt-1">
                  {order.customer_name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(order.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  {formatCurrency(order.subtotal + order.delivery_charge)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <StatusBadge variant={orderStatusVariantMap[order.order_status]}>
                {toTitleCase(order.order_status)}
              </StatusBadge>
              <StatusBadge variant={paymentStatusVariantMap[order.payment_status]}>
                {toTitleCase(order.payment_status)}
              </StatusBadge>
            </div>
            <div className="mt-3 flex items-center gap-1">
              <OrderActions order={order} onViewOrder={onViewOrder} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-hidden rounded-[26px] border border-violet-100 bg-white/80 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.4)] backdrop-blur-sm sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[linear-gradient(90deg,rgba(247,243,255,0.9),rgba(240,248,255,0.8))]">
              <tr className="border-b border-violet-100">
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Order
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Customer
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Date
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Total
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Payment
                </th>
                <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Status
                </th>
                <th className="h-12 px-6 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-violet-50/45"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="font-mono text-sm font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium">{order.customer_name}</span>
                      <span className="text-xs text-muted-foreground">{order.phone_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(order.created_at)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium">
                      {formatCurrency(order.subtotal + order.delivery_charge)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge variant={paymentStatusVariantMap[order.payment_status]}>
                      {toTitleCase(order.payment_status)}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge variant={orderStatusVariantMap[order.order_status]}>
                      {toTitleCase(order.order_status)}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <OrderActions order={order} onViewOrder={onViewOrder} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function OrderActions({ order, onViewOrder }: { order: Order; onViewOrder: (order: Order) => void }) {
  const router = useRouter();
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [cancelInput, setCancelInput] = React.useState('');
  const [isCancelling, setIsCancelling] = React.useState(false);

  const handleView = () => {
    onViewOrder(order);
  };

  const handleEdit = () => {
    router.push(`/dashboard/orders/${order.id}`);
  };

  const handleCancelConfirm = async () => {
    if (cancelInput.trim().toLowerCase() !== 'cancel') {
      toast.error('Please type "cancel" to confirm');
      return;
    }

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
      setCancelInput('');
      router.refresh();
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
          onClick={handleView}
          aria-label={`View order ${order.order_number}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
          onClick={handleEdit}
          aria-label={`Edit order ${order.order_number}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-700"
          onClick={() => setShowCancelDialog(true)}
          aria-label={`Cancel order ${order.order_number}`}
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel order?</DialogTitle>
            <DialogDescription>
              This will cancel order {order.order_number}. This action cannot be undone, but the order record will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-confirm-input">Type &quot;cancel&quot; to confirm</Label>
            <Input
              id="cancel-confirm-input"
              value={cancelInput}
              onChange={(e) => setCancelInput(e.target.value)}
              placeholder="cancel"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setCancelInput('');
              }}
              disabled={isCancelling}
              className="h-11"
            >
              Keep order
            </Button>
            <Button
              onClick={handleCancelConfirm}
              disabled={isCancelling || cancelInput.trim().toLowerCase() !== 'cancel'}
              className="h-11 bg-red-600 hover:bg-red-700"
            >
              {isCancelling ? 'Cancelling...' : 'Yes, cancel order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
