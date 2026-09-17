'use client';

import * as React from 'react';
import { Store } from 'lucide-react';
import type { Tenant } from '@/types';

interface StoreFooterProps {
  tenant: Tenant;
}

export function StoreFooter({ tenant }: StoreFooterProps) {
  const settings = tenant.settings as Record<string, unknown> | null;
  const description = settings?.description as string | undefined;
  const contactEmail = settings?.contact_email as string | undefined;
  const contactPhone = settings?.contact_phone as string | undefined;
  const address = settings?.address as string | undefined;

  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200/70 bg-slate-50/80">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:pr-8">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-sky-500 text-white shadow-sm">
                <Store className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold tracking-[-0.03em] text-slate-900">
                {tenant.name}
              </span>
            </div>
            {description && (
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
                {description}
              </p>
            )}
          </div>

          <div>
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

          <div>
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

        <div className="mt-10 flex flex-col gap-4 border-t border-slate-200 pt-5 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">
            © {currentYear} {tenant.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
