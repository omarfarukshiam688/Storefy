import type { Tenant } from '@/types';

interface ContactSectionProps {
  tenant: Tenant;
}

export function ContactSection({ tenant }: ContactSectionProps) {
  const settings = tenant.settings as Record<string, unknown> | null;
  const contactEmail = settings?.contact_email as string | undefined;
  const contactPhone = settings?.contact_phone as string | undefined;
  const address = settings?.address as string | undefined;

  return (
    <section className="border-t border-slate-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:pr-8 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
            <h2 className="text-2xl font-bold tracking-[-0.04em] text-slate-900 sm:text-3xl">
              Get in Touch
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Have a question or want to place an order? We&apos;d love to hear from you.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-900">
              Contact
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {contactEmail && (
                <li className="flex items-center gap-2.5">
                  <span className="text-xs font-medium text-slate-400">Email</span>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="transition-colors hover:text-violet-700"
                  >
                    {contactEmail}
                  </a>
                </li>
              )}
              {contactPhone && (
                <li className="flex items-center gap-2.5">
                  <span className="text-xs font-medium text-slate-400">Phone</span>
                  <a
                    href={`tel:${contactPhone}`}
                    className="transition-colors hover:text-violet-700"
                  >
                    {contactPhone}
                  </a>
                </li>
              )}
              {address && (
                <li className="flex items-start gap-2.5">
                  <span className="text-xs font-medium text-slate-400">Address</span>
                  <span className="leading-relaxed">{address}</span>
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-900">
              Store
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>
                <span className="text-xs font-medium text-slate-400">Status</span>
                <span className="ml-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  Open
                </span>
              </li>
              <li>
                <span className="text-xs font-medium text-slate-400">Store slug</span>
                <span className="ml-2 font-mono text-xs">{tenant.slug}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
