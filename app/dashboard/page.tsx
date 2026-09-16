import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/auth/session';
import { getTenantContext } from '@/lib/auth/tenant';
import Link from 'next/link';
import { Settings, Package, ShoppingCart, Users } from 'lucide-react';
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Welcome back, {context.profile.name ?? 'User'}
        </h1>
        {context.activeTenant && (
          <p className="text-base text-muted-foreground">
            Store:{' '}
            <span className="font-semibold text-foreground">
              {context.activeTenant.name}
            </span>
            {context.role === 'tenant_admin' && (
              <span className="ml-2 inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                Admin
              </span>
            )}
          </p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {context.role === 'tenant_admin' && (
          <Link href="/dashboard/settings" className="group">
            <div className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-6 transition-all duration-200 hover:shadow-md hover:border-primary/30 h-full">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">Store Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure your store
                  </p>
                </div>
              </div>
            </div>
          </Link>
        )}

        <Link href="/dashboard/products" className="group">
          <div className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-6 transition-all duration-200 hover:shadow-md hover:border-primary/30 h-full">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">Products</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your product catalog
                </p>
              </div>
            </div>
          </div>
        </Link>

        <div className="rounded-xl border border-border/80 bg-white/50 shadow-sm shadow-black/[0.01] backdrop-blur-sm p-6 opacity-60 h-full">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Orders</h3>
              <p className="text-sm text-muted-foreground">
                Coming in Module 6
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-white/50 shadow-sm shadow-black/[0.01] backdrop-blur-sm p-6 opacity-60 h-full">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Customers</h3>
              <p className="text-sm text-muted-foreground">
                Coming in Module 6
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Store Information</h2>
        {context.activeTenant && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Store Name:</span>
              <span className="font-semibold">
                {context.activeTenant.name}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Store Slug:</span>
              <span className="font-mono text-sm font-medium">
                {context.activeTenant.slug}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Role:</span>
              <span className="font-semibold capitalize">
                {context.role === 'tenant_admin'
                  ? 'Administrator'
                  : 'Staff'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status:</span>
              <span className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                context.activeTenant.is_active 
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700" 
                  : "border-red-200 bg-red-50 text-red-700"
              )}>
                {context.activeTenant.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
