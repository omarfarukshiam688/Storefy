import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/auth/session';
import { getTenantContext } from '@/lib/auth/tenant';
import Link from 'next/link';
import {
  ArrowRight,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function DashboardPage() {
  try {
    await requireAuthUser();
  } catch {
    redirect('/login');
  }

  const context = await getTenantContext();

  if (!context.activeTenant) {
    redirect('/dashboard/onboarding');
  }

  const displayName = context.profile.name ?? 'User';
  const storeName = context.activeTenant.name;

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
              Manage your products, keep your catalog organized, and grow your
              online store from one place.
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
                Online
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {context.role === 'tenant_admin' && (
          <Link href="/dashboard/settings" className="group">
            <div className="flex h-full min-h-[148px] flex-col justify-between rounded-[26px] border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_22px_50px_-30px_rgba(76,29,149,0.45)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 shadow-sm">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Store Settings
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Configure your storefront and account details.
                </p>
              </div>
              <div className="flex items-center justify-between text-sm font-medium text-violet-700">
                <span>Open</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        )}

        <Link href="/dashboard/products" className="group">
          <div className="flex h-full min-h-[148px] flex-col justify-between rounded-[26px] border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_22px_50px_-30px_rgba(76,29,149,0.45)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-sm">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Products</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Manage your product catalog and pricing.
              </p>
            </div>
            <div className="flex items-center justify-between text-sm font-medium text-violet-700">
              <span>Open</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </Link>

        <div className="rounded-[26px] border border-slate-200 bg-white/60 p-5 opacity-70 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.2)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-slate-900">Orders</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">Coming soon</p>
          </div>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white/60 p-5 opacity-70 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.2)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
            <Users className="h-5 w-5" />
          </div>
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-slate-900">Customers</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">Coming soon</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-[30px] border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.25)] sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                Store overview
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.05em] text-slate-900">
                Store Information
              </h2>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              Active
            </div>
          </div>

          {context.activeTenant && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    Store name
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {context.activeTenant.name}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    Store slug
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {context.activeTenant.slug}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    Role
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {context.role === 'tenant_admin'
                      ? 'Administrator'
                      : 'Staff'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    Status
                  </p>
                  <p
                    className={cn(
                      'mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
                      context.activeTenant.is_active
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                    )}
                  >
                    {context.activeTenant.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[30px] border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.25)] sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                Quick summary
              </p>
              <h3 className="mt-2 text-xl font-bold tracking-[-0.05em] text-slate-900">
                Business overview
              </h3>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-600">
                  Catalog
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  Ready
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-600">
                  Store setup
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {context.role === 'tenant_admin' ? 'Configured' : 'Accessed'}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-600">
                  Workspace
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  Connected
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
