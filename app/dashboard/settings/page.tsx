import { getTenantContext } from '@/lib/auth/tenant';
import { DashboardHeader } from '@/components/auth/dashboard-header';
import { StoreSettingsForm } from '@/components/admin/store-settings-form';

export default async function StoreSettingsPage() {
  const context = await getTenantContext();

  if (!context.activeTenant) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader profileName={context.profile.name} />
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight mb-4">
              Store settings
            </h1>
            <p className="text-muted-foreground">
              No active store selected. Please select or create a store first.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (context.role !== 'tenant_admin') {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader profileName={context.profile.name} />
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight mb-4">
              Store settings
            </h1>
            <p className="text-destructive">
              Only store administrators can modify store settings.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader profileName={context.profile.name} />
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Store settings
            </h1>
            <p className="text-muted-foreground">
              Configure your store&apos;s name, contact information, and
              business settings.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <StoreSettingsForm tenant={context.activeTenant} />
          </div>
        </div>
      </main>
    </div>
  );
}
