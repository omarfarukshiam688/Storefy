import { requireSuperAdmin } from '@/lib/auth/tenant';
import { getPlatformOverview, getRecentTenants } from '@/lib/platform';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Users,
  Package,
  Sparkles,
  ArrowUpRight,
  Store,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default async function PlatformOverviewPage() {
  await requireSuperAdmin();

  const [overview, recentTenants] = await Promise.all([
    getPlatformOverview(),
    getRecentTenants(5),
  ]);

  const metricCards = [
    {
      title: 'Total Tenants',
      value: overview.totalTenants,
      icon: Building2,
      className: 'from-violet-50 to-violet-50/50',
    },
    {
      title: 'Active Tenants',
      value: overview.activeTenants,
      icon: CheckCircle2,
      className: 'from-emerald-50 to-emerald-50/50',
    },
    {
      title: 'Suspended',
      value: overview.suspendedTenants,
      icon: XCircle,
      className: 'from-red-50 to-red-50/50',
    },
    {
      title: 'Total Users',
      value: overview.totalUsers,
      icon: Users,
      className: 'from-sky-50 to-sky-50/50',
    },
  ];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[30px] border border-violet-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(255,255,255,0.55)_32%,_rgba(218,233,255,0.45)_70%,_rgba(224,215,255,0.35)_100%)] p-6 shadow-[0_30px_80px_-40px_rgba(79,70,229,0.45)] sm:p-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700">
              <Sparkles className="h-3.5 w-3.5" />
              Storefy Platform
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-[-0.07em] text-slate-900 sm:text-4xl lg:text-[3.2rem]">
              Platform Overview
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
              Monitor and manage the Storefy multi-tenant platform. View tenants, plans, and platform-level metrics.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metricCards.map((card) => (
          <div
            key={card.title}
            className="flex flex-col justify-between rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {card.title}
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
              Activity
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.05em] text-slate-900">
              Recently Created Tenants
            </h2>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-white/80 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] backdrop-blur-sm overflow-hidden">
            {recentTenants.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm text-slate-500">No tenants found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[linear-gradient(90deg,rgba(247,243,255,0.9),rgba(240,248,255,0.8))]">
                    <tr className="border-b border-violet-100">
                      <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Tenant
                      </th>
                      <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Slug
                      </th>
                      <th className="h-12 px-6 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Status
                      </th>
                      <th className="h-12 px-6 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTenants.map((tenant) => (
                      <tr
                        key={tenant.id}
                        className="border-b border-slate-100 last:border-b-0 transition-colors hover:bg-violet-50/45"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                              <Store className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-slate-900">
                              {tenant.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-500 font-mono text-xs">
                            /{tenant.slug}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge variant={tenant.is_active ? 'success' : 'error'}>
                            {tenant.is_active ? 'Active' : 'Suspended'}
                          </StatusBadge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-slate-500">
                            {formatDistanceToNow(new Date(tenant.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
              Quick Actions
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.05em] text-slate-900">
              Platform
            </h2>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] space-y-3">
            <a
              href="/platform/tenants"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition-all hover:border-violet-200 hover:bg-violet-50/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Manage Tenants</p>
                <p className="text-xs text-slate-500">View, suspend, or reactivate tenants</p>
              </div>
              <ArrowUpRight className="ml-auto h-4 w-4 text-slate-400" />
            </a>
            <a
              href="/platform/plans"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition-all hover:border-violet-200 hover:bg-violet-50/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Manage Plans</p>
                <p className="text-xs text-slate-500">View and assign subscription plans</p>
              </div>
              <ArrowUpRight className="ml-auto h-4 w-4 text-slate-400" />
            </a>
            <a
              href="/platform/users"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition-all hover:border-violet-200 hover:bg-violet-50/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">View Users</p>
                <p className="text-xs text-slate-500">Inspect platform membership</p>
              </div>
              <ArrowUpRight className="ml-auto h-4 w-4 text-slate-400" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
