import Link from 'next/link';

export default function StorefrontOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
          Storefront
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] text-slate-900">Customize Store</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your storefront appearance, homepage sections, and branding.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link href="/dashboard/storefront/homepage" className="group">
          <div className="flex h-full min-h-[148px] flex-col justify-between rounded-[26px] border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_22px_50px_-30px_rgba(76,29,149,0.45)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Homepage</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Configure homepage sections, order, and content.
              </p>
            </div>
            <div className="flex items-center justify-between text-sm font-medium text-violet-700">
              <span>Open</span>
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/storefront/branding" className="group">
          <div className="flex h-full min-h-[148px] flex-col justify-between rounded-[26px] border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_22px_50px_-30px_rgba(76,29,149,0.45)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125A3.75 3.75 0 016.75.75h9.75A3.75 3.75 0 0120.25 4.125v10.5a3.75 3.75 0 01-3.75 3.75h-9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Branding</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Set your brand color and store logo.
              </p>
            </div>
            <div className="flex items-center justify-between text-sm font-medium text-violet-700">
              <span>Open</span>
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/storefront/contact" className="group">
          <div className="flex h-full min-h-[148px] flex-col justify-between rounded-[26px] border border-violet-100 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(76,29,149,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_22px_50px_-30px_rgba(76,29,149,0.45)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Contact</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Update contact info shown on your storefront.
              </p>
            </div>
            <div className="flex items-center justify-between text-sm font-medium text-violet-700">
              <span>Open</span>
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
