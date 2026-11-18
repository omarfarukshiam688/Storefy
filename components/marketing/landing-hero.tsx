import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Package,
  Play,
  ShoppingCart,
  Sparkles,
  Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const heroFeatures = [
  { icon: Store, label: 'নিজস্ব স্টোরফ্রন্ট' },
  { icon: Package, label: 'পণ্য ব্যবস্থাপনা' },
  { icon: ShoppingCart, label: 'অর্ডার পরিচালনা' },
];

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[840px] lg:ml-auto">
      <div
        className="absolute -inset-x-5 -bottom-5 top-5 rounded-[2.5rem] bg-[radial-gradient(ellipse_at_55%_45%,rgba(167,139,250,.44),rgba(216,180,254,.24)_48%,transparent_76%)] blur-2xl"
        aria-hidden="true"
      />
      <div
        className="absolute -right-2 top-[12%] h-16 w-16 rotate-12 rounded-[22px] border border-violet-200/80 bg-gradient-to-br from-white to-violet-100/90 shadow-[0_20px_40px_-24px_rgba(91,33,182,.65)] sm:-right-4 sm:h-20 sm:w-20"
        aria-hidden="true"
      />
      <div className="relative z-10 rounded-[1.4rem] border border-white bg-white/90 p-2 shadow-[0_32px_76px_-34px_rgba(55,32,118,.5)] sm:rounded-[1.8rem] sm:p-3">
        <div className="flex h-9 items-center justify-between px-2 sm:h-10 sm:px-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-sm">
              <Store className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-xs font-semibold tracking-tight text-slate-700 sm:text-sm">
              Storefy Dashboard
            </span>
          </div>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-violet-200" />
            <span className="h-2 w-2 rounded-full bg-indigo-200" />
            <span className="h-2 w-2 rounded-full bg-fuchsia-200" />
          </div>
        </div>
        <div className="relative aspect-[1365/768] overflow-hidden rounded-xl border border-violet-100/80 bg-[#f7f5ff] sm:rounded-2xl">
          <Image
            src="/marketing/dashboard-preview.png"
            alt="Storefy business dashboard showing storefront, product, order, and analytics tools"
            fill
            priority
            sizes="(max-width: 1023px) 96vw, (max-width: 1279px) 56vw, 700px"
            className="object-contain"
          />
        </div>
      </div>

      <div className="absolute -bottom-5 left-[5%] z-20 hidden items-center gap-2.5 rounded-2xl border border-white/90 bg-white/95 px-4 py-3 shadow-[0_18px_38px_-20px_rgba(76,29,149,.5)] sm:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <Package className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="text-xs font-semibold leading-relaxed text-slate-700" lang="bn">
          স্টোরফ্রন্ট · পণ্য · অর্ডার
        </span>
      </div>
      <div
        className="absolute -bottom-5 right-[12%] h-10 w-10 rounded-full border border-white/80 bg-gradient-to-br from-violet-300 to-indigo-500 shadow-[0_12px_28px_-12px_rgba(76,29,149,.6)] sm:-bottom-7 sm:right-[10%] sm:h-14 sm:w-14"
        aria-hidden="true"
      />
    </div>
  );
}

export function LandingHero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#fcfbff] px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8 lg:pb-28 lg:pt-16">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-40 -top-48 h-[38rem] w-[38rem] rounded-full bg-violet-200/55 blur-[110px]" />
        <div className="absolute -left-44 top-[38%] h-[27rem] w-[27rem] rounded-full bg-indigo-100/70 blur-[110px]" />
        <div className="absolute bottom-[-10rem] right-[22%] h-[24rem] w-[32rem] rounded-full bg-fuchsia-100/55 blur-[100px]" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-10 xl:gap-14">
        <div className="min-w-0" lang="bn" style={{ fontFamily: 'var(--font-noto-bengali), sans-serif' }}>
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-violet-200/90 bg-white/85 px-3.5 py-2 text-xs font-semibold text-violet-800 shadow-[0_8px_24px_-18px_rgba(76,29,149,.6)] sm:text-sm">
            <Sparkles className="h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" />
            <span>স্টোর, পণ্য ও অর্ডার—এক জায়গায়</span>
          </div>

          <h1 className="mt-6 max-w-2xl text-[2rem] font-bold leading-[1.42] tracking-[-0.035em] text-[#17183f] sm:text-[2.6rem] sm:leading-[1.38] lg:mt-7 lg:text-[3rem] lg:leading-[1.34] xl:text-[3.35rem]">
            আপনার ব্যবসার জন্য তৈরি করুন
            <span className="mt-1 block bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              নিজের ডিজিটাল স্টোর
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-[1.9] text-slate-600 sm:mt-6 sm:text-base sm:leading-8">
            নিজস্ব অনলাইন স্টোর সাজান, পণ্য পরিচালনা করুন এবং অর্ডার গুছিয়ে রাখুন—দৈনন্দিন ব্যবসার প্রয়োজনীয় কাজ এক প্ল্যাটফর্ম থেকেই।
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {heroFeatures.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-violet-100 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm sm:text-sm"
              >
                <Icon className="h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-gradient-to-r from-violet-700 via-violet-600 to-indigo-600 px-6 text-sm font-semibold text-white shadow-[0_14px_28px_-14px_rgba(91,33,182,.75)] transition duration-200 hover:-translate-y-0.5 hover:from-violet-800 hover:to-indigo-700 active:translate-y-0 sm:h-14 sm:px-7 sm:text-base"
            >
              <Link href="/auth/signup">
                এখনই শুরু করুন
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <button
              type="button"
              disabled
              aria-label="ডেমো দেখুন (শীঘ্রই আসছে)"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-violet-200 bg-white/75 px-6 text-sm font-semibold text-violet-800 transition-colors hover:bg-white disabled:cursor-not-allowed sm:h-14 sm:px-7 sm:text-base"
            >
              <Play className="h-4 w-4 fill-violet-700 text-violet-700" aria-hidden="true" />
              ডেমো দেখুন
            </button>
          </div>
        </div>

        <DashboardPreview />
      </div>
    </section>
  );
}
