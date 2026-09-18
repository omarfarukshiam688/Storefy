import { getTenantContext } from '@/lib/auth/tenant';
import { listStorefrontSections, ensureDefaultSections } from '@/lib/storefront/config';
import { StorefrontSectionsEditor } from '@/components/storefront/homepage-sections-editor';
import { Button } from '@/components/ui/button';

export default async function StorefrontHomepagePage() {
  const context = await getTenantContext();

  if (!context.activeTenant) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Homepage</h1>
          <p className="text-muted-foreground">No active store selected.</p>
        </div>
      </div>
    );
  }

  if (context.role !== 'tenant_admin') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Homepage</h1>
          <p className="text-destructive">Only store administrators can customize the storefront.</p>
        </div>
      </div>
    );
  }

  await ensureDefaultSections(context.activeTenant.id);
  const sections = await listStorefrontSections(context.activeTenant.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
            Storefront
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] text-slate-900">Homepage</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure the sections that appear on your storefront homepage.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={`/s/${context.activeTenant.slug}`} target="_blank" rel="noopener noreferrer">
            Preview Storefront
          </a>
        </Button>
      </div>

      <div className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-6">
        <StorefrontSectionsEditor
          tenantId={context.activeTenant.id}
          tenantSlug={context.activeTenant.slug}
          initialSections={sections}
        />
      </div>
    </div>
  );
}
