import { getTenantContext } from '@/lib/auth/tenant';
import { StoreSettingsForm } from '@/components/admin/store-settings-form';

export default async function StoreSettingsPage() {
  const context = await getTenantContext();

  if (!context.activeTenant) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            Store settings
          </h1>
          <p className="text-muted-foreground">
            No active store selected. Please select or create a store first.
          </p>
        </div>
      </div>
    );
  }

  if (context.role !== 'tenant_admin') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            Store settings
          </h1>
          <p className="text-destructive">
            Only store administrators can modify store settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Store settings
        </h1>
        <p className="text-muted-foreground">
          Configure your store&apos;s name, contact information, and
          business settings.
        </p>
      </div>

      <div className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-6 lg:p-8">
        <StoreSettingsForm tenant={context.activeTenant} />
      </div>
    </div>
  );
}
