import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StorefrontContactPage() {
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
          Storefront / Contact
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] text-slate-900">Contact</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contact information shown on your storefront is managed from Store Settings.
        </p>
      </div>
      <div className="rounded-xl border border-border/80 bg-white/70 shadow-sm shadow-black/[0.02] backdrop-blur-sm p-6">
        <p className="text-sm text-muted-foreground">
          Update your phone, email, address, and social links in{' '}
          <Link href="/dashboard/settings" className="text-violet-700 hover:underline">
            Store Settings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
