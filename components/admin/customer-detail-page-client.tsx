'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { ArrowLeft, Package, Mail, Phone, MapPin, FileText } from 'lucide-react';
import type { Customer, CustomerStatus, Order, OrderStatus, PaymentStatus } from '@/types';

interface CustomerDetailPageClientProps {
  customer: Customer;
  stats: {
    total_orders: number;
    total_spending: number;
    last_order_at: string | null;
  };
  orders: Order[];
}

const STATUS_OPTIONS: { value: CustomerStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'blocked', label: 'Blocked' },
];

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
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

function maskEmail(email: string | null): string {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!domain) return '—';
  const maskedLocal = local.length > 2 ? `${local.slice(0, 2)}***` : `${local}***`;
  return `${maskedLocal}@${domain}`;
}

export function CustomerDetailPageClient({ customer, stats, orders }: CustomerDetailPageClientProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? '',
    address: customer.address ?? '',
    district: customer.district ?? '',
    notes: customer.notes ?? '',
    status: customer.status,
  });

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error(result.error ?? 'Failed to update customer');
        return;
      }

      toast.success('Customer updated');
      setIsEditing(false);
      router.refresh();
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 rounded-[28px] border border-violet-200/80 bg-[linear-gradient(135deg,rgba(248,245,255,0.95),rgba(239,248,255,0.9))] p-5 shadow-[0_20px_55px_-35px_rgba(76,29,149,0.45)] sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-500 hover:bg-violet-50 hover:text-violet-700"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">
              Customer details
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.06em] text-slate-900">
              {customer.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Customer since {formatDate(customer.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isEditing ? (
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setIsEditing(true)}
            >
              Edit customer
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="h-11"
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email ?? '',
                    address: customer.address ?? '',
                    district: customer.district ?? '',
                    notes: customer.notes ?? '',
                    status: customer.status,
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                className="h-11"
                onClick={handleSave}
                disabled={isUpdating}
              >
                {isUpdating ? 'Saving...' : 'Save changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Main content */}
        <div className="xl:col-span-2 space-y-6">
          {/* Customer information */}
          <div className="rounded-[24px] border border-violet-100 bg-white/75 p-5 shadow-[0_16px_40px_-30px_rgba(76,29,149,0.4)] sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">Customer Information</h2>
            {isEditing ? (
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-district">District</Label>
                  <Input
                    id="edit-district"
                    value={editForm.district}
                    onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Input
                    id="edit-notes"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value) => setEditForm({ ...editForm, status: value as CustomerStatus })}
                  >
                    <SelectTrigger id="edit-status" className="h-11 w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Name</p>
                  <p className="mt-2 text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {customer.name}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Phone</p>
                  <p className="mt-2 text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {customer.phone}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Email</p>
                  <p className="mt-2 text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {maskEmail(customer.email)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">District</p>
                  <p className="mt-2 text-base font-semibold text-slate-900 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {customer.district ?? '—'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:col-span-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Address</p>
                  <p className="mt-2 text-base font-semibold text-slate-900 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {customer.address ?? '—'}
                  </p>
                </div>
                {customer.notes && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:col-span-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Notes</p>
                    <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      {customer.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order History */}
          <div className="rounded-[24px] border border-violet-100 bg-white/75 p-5 shadow-[0_16px_40px_-30px_rgba(76,29,149,0.4)] sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">Order History</h2>
            {orders.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/dashboard/orders/${order.id}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition-colors hover:border-violet-200 hover:bg-violet-50/40"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-semibold text-foreground hover:text-primary transition-colors">
                        {order.order_number}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={orderStatusVariantMap[order.order_status]}>
                        {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}
                      </StatusBadge>
                      <StatusBadge variant={paymentStatusVariantMap[order.payment_status]}>
                        {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                      </StatusBadge>
                      <span className="ml-2 text-sm font-semibold">
                        {formatCurrency(order.subtotal + order.delivery_charge)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="rounded-[24px] border border-violet-100 bg-white/75 p-5 shadow-[0_16px_40px_-30px_rgba(76,29,149,0.4)] sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">Status</h2>
            {isEditing ? (
              <div className="mt-4 space-y-2">
                <Label htmlFor="status-select">Customer status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm({ ...editForm, status: value as CustomerStatus })}
                >
                  <SelectTrigger id="status-select" className="h-11 w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="mt-4">
                <StatusBadge variant={customer.status === 'active' ? 'success' : customer.status === 'inactive' ? 'neutral' : 'error'}>
                  {customer.status}
                </StatusBadge>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="rounded-[24px] border border-violet-100 bg-white/75 p-5 shadow-[0_16px_40px_-30px_rgba(76,29,149,0.4)] sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">Summary</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Total orders
                </span>
                <span className="font-semibold">{stats.total_orders}</span>
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Total spending</span>
                <span className="text-lg font-bold tracking-[-0.03em]">{formatCurrency(stats.total_spending)}</span>
              </div>
              {stats.last_order_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Last order</span>
                  <span className="font-medium">{formatDate(stats.last_order_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="rounded-[24px] border border-violet-100 bg-white/75 p-5 shadow-[0_16px_40px_-30px_rgba(76,29,149,0.4)] sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">Timeline</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Created</span>
                <span className="font-medium">{formatDate(customer.created_at)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Updated</span>
                <span className="font-medium">{formatDate(customer.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
