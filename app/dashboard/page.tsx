import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/auth/session';
import { getTenantContext } from '@/lib/auth/tenant';
import { getDashboardStats, getRecentOrders } from '@/lib/dashboard';
import { DashboardMetricCard } from '@/components/admin/dashboard-metric-card';
import { DashboardRecentOrders } from '@/components/admin/dashboard-recent-orders';
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  Users,
  Package,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function DashboardPage() {
  await requireAuthUser();

  const context = await getTenantContext();

  if (!context.activeTenant) {
    redirect('/dashboard/onboarding');
  }

  const tenantId = context.activeTenant.id;
  const displayName = context.profile.name ?? 'User';
  const storeName = context.activeTenant.name;

  const [stats, recentOrders] = await Promise.all([
    getDashboardStats(tenantId),
    getRecentOrders(tenantId, 5),
  ]);

  const averageOrderValue =
    stats.paidOrdersCount > 0 ? stats.totalRevenue / stats.paidOrdersCount : 0;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-violet-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(255,255,255,0.55)_32%,_rgba(218,233,255,0.45)_70%,_rgba(224,215,255,0.35)_100%)] p-6 shadow-[0_30px_80px_-40px_rgba(79,70,229,0.45)] sm:p-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700">
              <Sparkles className="h-3.5 w-3.5" />
              Your store
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-[-0.07em] text-slate-900 sm:text-4xl lg:text-[3.2rem]">
              Welcome back, {displayName}
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
              Here&apos;s what&apos;s happening with your store today.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700">
                {storeName}
              </span>
              {context.role === 'tenant_admin' && (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Admin
                </span>
              )}
            </div>
          </div>

          <div className="flex w-full max-w-xs items-center justify-between gap-3 rounded-[22px] border border-violet-100 bg-white/70 p-4 shadow-sm sm:justify-self-end">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Status
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {context.activeTenant.is_active ? 'Online' : 'Offline'}
              </p>
            </div>
            <div
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-2xl',
                context.activeTenant.is_active
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              )}
            >
              <span
                className={cn(
                  'h-3 w-3 rounded-full',
                  context.activeTenant.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                )}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <DashboardMetricCard
          title="Total Orders"
          value={stats.totalOrders}
          icon={ShoppingCart}
        />
        <DashboardMetricCard
          title="Pending Orders"
          value={stats.pendingOrders}
          icon={Clock}
        />
        <DashboardMetricCard
          title="Completed Orders"
          value={stats.completedOrders}
          icon={CheckCircle2}
        />
        <DashboardMetricCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon={Users}
        />
        <DashboardMetricCard
          title="Active Products"
          value={stats.activeProducts}
          icon={Package}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
                Recent activity
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.05em] text-slate-900">
                Recent Orders
              </h2>
            </div>
          </div>
          <DashboardRecentOrders orders={recentOrders} />
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
              Revenue
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.05em] text-slate-900">
              Sales Summary
            </h2>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Total Revenue
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                  }).format(stats.totalRevenue)}
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <span className="text-sm font-medium text-slate-600">
                  Paid orders
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {stats.paidOrdersCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <span className="text-sm font-medium text-slate-600">
                  Avg. order value
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                  }).format(averageOrderValue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
