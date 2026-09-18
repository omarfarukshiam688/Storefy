import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getTenantContext } from '@/lib/auth/tenant';
import { Button } from '@/components/ui/button';
import { BrandingEditor } from '@/components/storefront/branding-editor';

export default async function StorefrontBrandingPage() {
  const context = await getTenantContext();

  if (!context.activeTenant) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Branding</h1>
          <p className="text-muted-foreground">No active store selected.</p>
        </div>
      </div>
    );
  }

  if (context.role !== 'tenant_admin') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Branding</h1>
          <p className="text-destructive">Only store administrators can modify branding.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/storefront">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
          Storefront / Branding
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] text-slate-900">Branding</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your brand color, logo, and favicon. These appear throughout your storefront.
        </p>
      </div>

      <div className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-6">
        <BrandingEditor tenant={context.activeTenant} />
      </div>
    </div>
  );
}
