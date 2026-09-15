import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/auth/session';
import { getTenantContext } from '@/lib/auth/tenant';
import { DashboardHeader } from '@/components/auth/dashboard-header';
import Link from 'next/link';
import { Settings, Package, ShoppingCart, Users } from 'lucide-react';

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
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader profileName={context.profile.name} />
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
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
                  <span className="ml-2 inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-900 rounded">
                    Admin
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {context.role === 'tenant_admin' && (
              <Link href="/dashboard/settings">
                <div className="rounded-lg border border-border bg-card p-6 hover:border-primary hover:shadow-sm transition-all cursor-pointer h-full">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <Settings className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Store Settings</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure your store
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            <Link href="/dashboard/products">
              <div className="rounded-lg border border-border bg-card p-6 hover:border-primary hover:shadow-sm transition-all cursor-pointer h-full">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Products</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage your product catalog
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <div className="rounded-lg border border-border bg-card p-6 opacity-50 cursor-not-allowed h-full">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Orders</h3>
                  <p className="text-sm text-muted-foreground">
                    Coming in Module 6
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 opacity-50 cursor-not-allowed h-full">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Customers</h3>
                  <p className="text-sm text-muted-foreground">
                    Coming in Module 6
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Cards */}
          <div className="rounded-lg border border-border bg-card p-6">
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
                  <span className="font-semibold">
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
                  <span className="font-semibold text-green-600">
                    {context.activeTenant.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}