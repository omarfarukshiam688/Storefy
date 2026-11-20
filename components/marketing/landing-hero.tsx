import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Package,
  Play,
  ShoppingCart,
  Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MarketingCopy, MarketingLocale } from './marketing-copy';

const heroFeatureIcons = [Store, Package, ShoppingCart];

function DashboardPreview({ copy }: { copy: MarketingCopy['hero'] }) {
  return (
    <div className="relative mx-auto mt-12 w-full max-w-[1080px] sm:mt-16 lg:mt-12">
      <div
        className="absolute -inset-x-8 top-8 h-[82%] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_50%,rgba(139,92,246,.24),rgba(196,181,253,.12)_52%,transparent_76%)] blur-3xl sm:-inset-x-14"
        aria-hidden="true"
      />
      <div
        className="absolute -right-4 top-[18%] h-20 w-20 rounded-[1.75rem] border border-violet-200/70 bg-gradient-to-br from-white/90 to-violet-100/80 shadow-[0_24px_70px_-34px_rgba(76,29,149,.55)] sm:-right-8 sm:h-28 sm:w-28"
        aria-hidden="true"
      />
      <div className="relative z-10 rounded-[1.5rem] border border-white/90 bg-white/80 p-2 shadow-[0_38px_100px_-44px_rgba(55,32,118,.5)] backdrop-blur-xl sm:rounded-[2rem] sm:p-3">
        <div className="flex h-9 items-center justify-between px-2 sm:h-11 sm:px-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-rose-300" />
              <span className="h-2 w-2 rounded-full bg-amber-300" />
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
            </div>
            <span className="ml-1 hidden h-5 w-px bg-violet-100 sm:block" aria-hidden="true" />
            <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-tight text-slate-600 sm:text-xs">
              <Store className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
              {copy.dashboardLabel}
            </span>
          </div>
          <span className="hidden rounded-full border border-violet-100 bg-white/90 px-2.5 py-1 text-[10px] font-medium text-slate-500 sm:inline-flex">
            {copy.workspace}
          </span>
        </div>
        <div className="relative aspect-[1365/768] overflow-hidden rounded-xl border border-violet-100/80 bg-[#f7f5ff] sm:rounded-[1.4rem]">
          <Image
            src="/marketing/storefy-dashboard-hero.png"
            alt={copy.imageAlt}
            fill
            priority
            sizes="(max-width: 640px) 94vw, (max-width: 1024px) 92vw, 1080px"
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}

export function LandingHero({
  locale,
  copy,
}: {
  locale: MarketingLocale;
  copy: MarketingCopy['hero'];
}) {
  return (
    <section
      lang={locale}
      className="relative isolate overflow-hidden bg-[#fcfbff] px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pb-16 lg:pt-16"
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(196,181,253,.4),transparent_58%)]" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(124, 58, 237, 0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(124, 58, 237, 0.07) 1px, transparent 1px)',
            backgroundSize: '58px 58px',
            maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
          }}
        />
        <div className="absolute -left-40 top-44 h-80 w-80 rounded-full bg-indigo-200/35 blur-[110px]" />
        <div className="absolute -right-40 top-48 h-96 w-96 rounded-full bg-fuchsia-200/35 blur-[120px]" />
        <div className="absolute left-1/2 top-[34rem] h-72 w-[46rem] -translate-x-1/2 rounded-full bg-violet-100/50 blur-[110px]" />
      </div>

      <div className="mx-auto w-full max-w-[1320px]">
        <div
          className="mx-auto max-w-5xl text-center"
          style={{
            fontFamily:
              locale === 'bn'
                ? 'var(--font-noto-bengali), sans-serif'
                : 'var(--font-dm-sans), sans-serif',
          }}
        >
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-violet-200/80 bg-white/80 px-3.5 py-2 text-xs font-semibold text-violet-800 shadow-[0_12px_34px_-24px_rgba(76,29,149,.6)] backdrop-blur sm:text-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <Store className="h-3 w-3" aria-hidden="true" />
            </span>
            <span>{copy.badge}</span>
          </div>

          <h1 className="mt-6 text-balance text-[2.15rem] font-bold leading-[1.32] tracking-[-0.045em] text-[#17183f] sm:mt-7 sm:text-[3.25rem] sm:leading-[1.34] lg:mt-6 lg:text-[3.375rem] lg:leading-[1.36] xl:text-[3.625rem]">
            <span className="block">{copy.titleLineOne}</span>
            <span className="mt-1 block bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {copy.titleLineTwo}
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-[36rem] text-balance text-[15px] leading-[1.9] text-slate-600 sm:mt-6 sm:text-base sm:leading-8 lg:mt-6 lg:text-[1.0625rem] lg:leading-[1.8]">
            {copy.description}
          </p>

          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center lg:mt-8">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-gradient-to-r from-violet-700 via-violet-600 to-indigo-600 px-7 text-sm font-semibold text-white shadow-[0_16px_34px_-18px_rgba(91,33,182,.8)] transition duration-200 hover:-translate-y-0.5 hover:from-violet-800 hover:to-indigo-700 active:translate-y-0 sm:h-14 sm:px-8 sm:text-base"
            >
              <Link href="/auth/signup">
                {copy.getStarted}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <button
              type="button"
              disabled
              aria-label={copy.demoAria}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-violet-200/90 bg-white/80 px-7 text-sm font-semibold text-violet-800 shadow-sm transition-colors hover:bg-white disabled:cursor-not-allowed sm:h-14 sm:px-8 sm:text-base"
            >
              <Play className="h-4 w-4 fill-violet-700 text-violet-700" aria-hidden="true" />
              {copy.demo}
            </button>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:mt-8 sm:gap-x-8 lg:mt-8">
            {copy.features.map((label, index) => {
              const Icon = heroFeatureIcons[index];

              return (
              <span
                key={label}
                className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 sm:text-sm"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-violet-100 bg-white/80 text-violet-700 shadow-sm">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                {label}
              </span>
              );
            })}
          </div>
        </div>

        <DashboardPreview copy={copy} />
      </div>
    </section>
  );
}
