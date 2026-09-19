import Link from 'next/link';
import { StatusBadge } from '@/components/ui/status-badge';
import type { RecentOrder } from '@/lib/dashboard';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function toTitleCase(value: string | undefined | null): string {
  if (!value) return 'Unknown';
  const normalized = String(value);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

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

interface DashboardRecentOrdersProps {
  orders: RecentOrder[];
}

export function DashboardRecentOrders({ orders }: DashboardRecentOrdersProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
        <p className="text-sm text-slate-500">No orders yet</p>
        <p className="text-xs text-slate-400 mt-1">
          Orders will appear here when customers place them through your storefront.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/dashboard/orders/${order.id}`}
            className="block rounded-xl border border-slate-200 bg-white/70 p-4 transition-colors hover:border-violet-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-semibold text-slate-900">
                  {order.order_number}
                </p>
                <p className="text-sm font-medium text-slate-700 mt-1">
                  {order.customer_name}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDate(order.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">
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
          </Link>
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
                      className="font-mono text-sm font-semibold text-slate-900 hover:text-violet-700 transition-colors"
                    >
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{order.customer_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-500">{formatDate(order.created_at)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-900">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
