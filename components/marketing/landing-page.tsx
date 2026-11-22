'use client';

import * as React from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import Image from 'next/image';
import Link from 'next/link';
import {
  BarChart3,
  Check,
  CreditCard,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Facebook,
  Globe,
  Image as ImageIcon,
  Instagram,
  LayoutDashboard,
  Mail,
  Menu,
  Palette,
  Package,
  ShoppingCart,
  Star,
  Store,
  Tag,
  Users,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Plan } from '@/types';
import { LandingHero } from './landing-hero';
import {
  MARKETING_LOCALE_COOKIE,
  marketingCopy,
  showcaseTabKeys,
} from './marketing-copy';
import type {
  MarketingCopy,
  MarketingLocale,
  ShowcaseTab,
} from './marketing-copy';

export type MarketingPlan = Pick<
  Plan,
  | 'id'
  | 'name'
  | 'description'
  | 'price_monthly'
  | 'product_limit'
  | 'archived_product_limit'
  | 'order_limit'
  | 'storage_limit_bytes'
  | 'features'
>;

const navigationItems = [
  { label: 'features', href: '#features' },
  { label: 'howItWorks', href: '#how-it-works' },
  { label: 'pricing', href: '#pricing' },
  { label: 'faq', href: '#faq' },
] as const;

const featureIcons = [
  Store,
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Star,
  CreditCard,
  Users,
  Palette,
  Tag,
  ImageIcon,
  Check,
] as const;
const showcaseIcons = {
  dashboard: LayoutDashboard,
  products: Package,
  orders: ShoppingCart,
  analytics: BarChart3,
  storefront: Store,
} as const;
const INITIAL_FEATURE_COUNT = 8;

function Logo({ alt }: { alt: string }) {
  return (
    <div className="flex items-center">
      <div className="relative h-11 w-[88px] overflow-hidden bg-transparent sm:h-12 sm:w-24">
        <Image
          src="/storefy-LOGO.png"
          alt={alt}
          width={180}
          height={90}
          className="h-full w-full object-contain"
          priority
        />
      </div>
    </div>
  );
}

function LanguageSwitcher({
  locale,
  label,
  onChange,
}: {
  locale: MarketingLocale;
  label: string;
  onChange: (locale: MarketingLocale) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center gap-0.5 rounded-xl border border-violet-200/80 bg-violet-50/70 p-1"
    >
      {([
        { value: 'bn', label: 'বাংলা' },
        { value: 'en', label: 'English' },
      ] as const).map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={locale === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
            locale === option.value
              ? 'bg-white text-violet-800 shadow-sm'
              : 'text-slate-500 hover:bg-white/70 hover:text-slate-800',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function MobileNav({
  open,
  onClose,
  locale,
  onLocaleChange,
  copy,
}: {
  open: boolean;
  onClose: () => void;
  locale: MarketingLocale;
  onLocaleChange: (locale: MarketingLocale) => void;
  copy: MarketingCopy;
}) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-transparent transition-all duration-200 motion-reduce:transition-none lg:hidden',
        open
          ? 'pointer-events-auto visible opacity-100'
          : 'pointer-events-none invisible opacity-0'
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default bg-slate-950/45 focus-visible:outline-none"
        onClick={onClose}
        aria-label={copy.accessibility.closeNavigation}
        tabIndex={open ? 0 : -1}
      />
      <div
        className={cn(
          'absolute inset-y-0 left-0 h-dvh w-[82%] max-w-sm overflow-y-auto border-r border-violet-100 bg-white px-5 pb-6 shadow-2xl transition-transform duration-200 motion-reduce:transition-none',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={copy.accessibility.mainNavigation}
      >
        <div className="flex items-center justify-between pb-4">
          <Logo alt={copy.accessibility.logo} />
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={copy.accessibility.closeNavigation}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="mt-8 space-y-2">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex min-h-12 items-center justify-between rounded-xl border border-transparent px-4 py-3.5 text-base font-medium text-slate-800 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-slate-900 touch-manipulation select-none"
            >
              {copy.nav[item.label]}
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
          ))}
        </nav>

        <div className="mt-8 space-y-3 border-t border-slate-200 pt-5">
          <Link
            href="/auth/login"
            className="block text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            {copy.nav.signIn}
          </Link>
          <Button asChild className="w-full" size="lg">
            <Link href="/auth/signup">{copy.nav.startFree}</Link>
          </Button>
          <div className="flex justify-center border-t border-slate-200 pt-4">
            <LanguageSwitcher
              locale={locale}
              label={copy.accessibility.chooseLanguage}
              onChange={onLocaleChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface PricingCardProps {
  plan: MarketingPlan;
  copy: MarketingCopy['pricing'];
  locale: MarketingLocale;
  isPopular: boolean;
}

function PricingCard({
  plan,
  copy,
  locale,
  isPopular,
}: PricingCardProps) {
  const featureConfig = plan.features;
  if (!featureConfig || typeof featureConfig !== 'object') {
    throw new Error(`Plan "${plan.name}" has invalid feature configuration.`);
  }

  const teamMemberLimit = featureConfig.team_members;
  const analyticsIncluded = featureConfig.analytics;
  const customDomainIncluded = featureConfig.custom_domain;

  if (
    typeof teamMemberLimit !== 'number' ||
    !Number.isFinite(teamMemberLimit) ||
    typeof analyticsIncluded !== 'boolean' ||
    typeof customDomainIncluded !== 'boolean'
  ) {
    throw new Error(`Plan "${plan.name}" has invalid feature configuration.`);
  }

  const numberLocale = locale === 'bn' ? 'bn-BD' : 'en-BD';
  const formatLimit = (limit: number, item: string) => {
    if (limit < 0) {
      return copy.features.unlimited.replace('{item}', item);
    }
    if (limit === 0) {
      return copy.features.none.replace('{item}', item);
    }
    return copy.features.limit
      .replace('{count}', limit.toLocaleString(numberLocale))
      .replace('{item}', item);
  };
  const storageGigabytes = plan.storage_limit_bytes / 1024 ** 3;
  const storageLabel =
    plan.storage_limit_bytes === 0
      ? copy.features.none.replace('{item}', copy.features.storageUnit)
      : plan.storage_limit_bytes < 0
        ? copy.features.unlimited.replace('{item}', copy.features.storageUnit)
        : copy.features.storage.replace(
            '{amount}',
            Number.isInteger(storageGigabytes)
              ? storageGigabytes.toLocaleString(numberLocale)
              : storageGigabytes.toLocaleString(numberLocale, {
                  maximumFractionDigits: 1,
                }),
          );
  const features = [
    {
      label: formatLimit(plan.product_limit, copy.features.activeProducts),
      included: plan.product_limit !== 0,
    },
    {
      label: formatLimit(
        plan.archived_product_limit,
        copy.features.archivedProducts,
      ),
      included: plan.archived_product_limit !== 0,
    },
    {
      label: formatLimit(plan.order_limit, copy.features.orders),
      included: plan.order_limit !== 0,
    },
    {
      label: storageLabel,
      included: plan.storage_limit_bytes !== 0,
    },
    {
      label: formatLimit(teamMemberLimit, copy.features.teamMembers),
      included: teamMemberLimit !== 0,
    },
    {
      label: copy.features.analytics,
      included: analyticsIncluded,
    },
    {
      label: copy.features.customDomain,
      included: customDomainIncluded,
    },
  ];
  const planName =
    plan.name.charAt(0).toUpperCase() + plan.name.slice(1).toLowerCase();

  return (
    <Card
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-[26px] border p-0 transition-shadow hover:shadow-lg',
        isPopular
          ? 'border-violet-500 bg-white shadow-[0_24px_60px_-24px_rgba(91,33,182,0.42)]'
          : 'border-slate-200 bg-white'
      )}
    >
      <div
        className={cn(
          'flex flex-col p-6 sm:p-8',
          isPopular
            ? 'bg-violet-700 text-white'
            : 'bg-violet-50/70 text-slate-900',
        )}
      >
        <div className="flex min-h-7 items-start justify-between gap-3">
          <h3 className="text-[19px] leading-[1.5rem] font-bold tracking-tight">{planName}</h3>
          {isPopular && (
            <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-semibold">
              {copy.popular}
            </span>
          )}
        </div>
        <p
          className={cn(
            'mt-2 min-h-10 text-[17px] leading-[1.25rem]',
            isPopular ? 'text-violet-100' : 'text-slate-600',
          )}
        >
          {plan.description}
        </p>

        <div className="mt-5 flex items-baseline gap-1">
          <span className="text-4xl font-extrabold tracking-tight">
            ৳{plan.price_monthly.toLocaleString(numberLocale)}
          </span>
          <span
            className={cn(
              'text-sm',
              isPopular ? 'text-violet-100' : 'text-slate-500',
            )}
          >
            {copy.perMonth}
          </span>
        </div>

        <Link
          href="/auth/signup"
          className={cn(
            'mt-5 block w-full rounded-xl px-5 py-3 text-center text-sm font-semibold transition-colors',
            isPopular
              ? 'bg-white text-violet-800 hover:bg-violet-50'
              : 'bg-violet-700 text-white hover:bg-violet-800',
          )}
        >
          {copy.getStarted}
        </Link>
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <ul className="space-y-3.5">
          {features.map((feature) => (
            <li key={feature.label} className="flex items-start gap-2.5">
              {feature.included ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              ) : (
                <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              )}
              <span
                className={cn(
                  'text-[17px] leading-[1.5rem]',
                  feature.included ? 'text-slate-700' : 'text-slate-400'
                )}
              >
                {feature.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export function LandingPage({
  initialLocale,
  plans,
}: {
  initialLocale: MarketingLocale;
  plans: MarketingPlan[];
}) {
  const [locale, setLocale] = React.useState(initialLocale);
  const copy = marketingCopy[locale];
  const [activeTab, setActiveTab] = React.useState<ShowcaseTab>('dashboard');
  const [showAllFeatures, setShowAllFeatures] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  const handleLocaleChange = (nextLocale: MarketingLocale) => {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${MARKETING_LOCALE_COOKIE}=${nextLocale}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
    document.documentElement.lang = nextLocale;
    setLocale(nextLocale);
  };

  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => {
    if (!isMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  React.useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;

      const id = href.slice(1);
      const element = document.getElementById(id);
      if (!element) return;

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        return;
      }

      e.preventDefault();
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  return (
    <div
      lang={locale}
      className="min-h-screen bg-atmosphere-gradient text-slate-900"
      style={{
        fontFamily:
          locale === 'bn'
            ? 'var(--font-noto-bengali), sans-serif'
            : 'var(--font-dm-sans), sans-serif',
      }}
    >
      <header
        className={cn(
          'sticky top-0 z-40 border-b backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300',
          isScrolled
            ? 'bg-white/80 shadow-[0_8px_24px_-20px_rgba(15,23,42,.45)]'
            : 'border-transparent bg-transparent shadow-none',
        )}
        style={{
          borderBottomColor: isScrolled
            ? 'rgba(226, 232, 240, 0.7)'
            : 'transparent',
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="Storefy"
            className="flex items-center"
          >
            <Logo alt={copy.accessibility.logo} />
          </Link>

          <nav
            aria-label={copy.accessibility.mainNavigation}
            className="hidden items-center gap-8 lg:flex"
          >
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
              >
                {copy.nav[item.label]}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
            >
              {copy.nav.signIn}
            </Link>
            <Button asChild size="lg">
              <Link href="/auth/signup">{copy.nav.startFree}</Link>
            </Button>
            <LanguageSwitcher
              locale={locale}
              label={copy.accessibility.chooseLanguage}
              onChange={handleLocaleChange}
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="relative z-50 lg:hidden touch-manipulation"
            onClick={() => setIsMenuOpen(true)}
            aria-label={copy.accessibility.openNavigation}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <MobileNav
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        locale={locale}
        onLocaleChange={handleLocaleChange}
        copy={copy}
      />

      <main className="overflow-x-hidden">
        <LandingHero locale={locale} copy={copy.hero} />

        <section
          id="features"
          className="scroll-section flex flex-col justify-center px-4 py-12 sm:px-6 sm:py-14 lg:min-h-[calc(100svh-4.9rem)] lg:px-8 lg:py-12"
        >
          <div className="mx-auto w-full max-w-[1400px]">
            <div className="mx-auto max-w-[1320px] text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
                {copy.featureSection.eyebrow}
              </p>
              <h2 className="mt-4 text-4xl font-extrabold leading-[1.25] tracking-[-0.035em] text-slate-950 sm:text-5xl whitespace-pre-line">
                {copy.featureSection.title}
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                {copy.featureSection.description}
              </p>
            </div>

            <div
              id="marketing-feature-grid"
              className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-5 lg:grid-cols-4"
            >
              {(showAllFeatures
                ? copy.featureSection.items
                : copy.featureSection.items.slice(0, INITIAL_FEATURE_COUNT)
              ).map((feature, index) => {
                const Icon = featureIcons[index];

                /* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Keyboard focus styling is explicitly required for feature cards. */
                return (
                  <article
                    key={feature.id}
                    tabIndex={0}
                    className={cn(
                      'group h-full rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.28)] transition-[border-color,box-shadow] duration-200 hover:border-violet-600! hover:shadow-[0_16px_34px_-18px_rgba(91,33,182,0.38)] focus-visible:border-violet-600! focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 motion-reduce:transition-none',
                      showAllFeatures &&
                        index >= INITIAL_FEATURE_COUNT &&
                        'animate-slide-up',
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 transition-colors duration-200 group-hover:bg-violet-700 group-hover:text-white group-focus-visible:bg-violet-700 group-focus-visible:text-white motion-reduce:transition-none">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>

                    <h3 className="mt-4 text-lg font-bold leading-7 tracking-[-0.02em] text-slate-950 sm:text-xl">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 text-[15px] leading-6 text-slate-600">
                      {feature.description}
                    </p>
                  </article>
                );
                /* eslint-enable jsx-a11y/no-noninteractive-tabindex */
              })}
            </div>

            {copy.featureSection.items.length > INITIAL_FEATURE_COUNT && (
              <div className="mt-8 flex justify-center">
                <Button
                  type="button"
                  aria-controls="marketing-feature-grid"
                  aria-expanded={showAllFeatures}
                  onClick={() => setShowAllFeatures((expanded) => !expanded)}
                  className="h-auto min-h-12 rounded-full bg-violet-700 px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-16px_rgba(91,33,182,0.75)] transition-[background-color,box-shadow] hover:bg-violet-800 hover:shadow-[0_14px_32px_-16px_rgba(91,33,182,0.85)] active:bg-violet-900 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
                >
                  {showAllFeatures
                    ? copy.featureSection.seeLess
                    : copy.featureSection.seeMore}
                  {showAllFeatures ? (
                    <ChevronUp className="ml-2 h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-section flex flex-col justify-center px-4 py-16 sm:px-6 sm:py-20 lg:min-h-[calc(100svh-4.9rem)] lg:px-8 lg:py-16 bg-[#FAF8FF]"
        >
          <div className="mx-auto w-full max-w-[1680px]">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
                {copy.showcase.eyebrow}
              </p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.055em] text-slate-950 sm:text-4xl lg:text-[38px] lg:leading-[1.12]">
                {copy.showcase.title}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-lg leading-7 text-slate-600 sm:text-xl sm:leading-8">
                {copy.showcase.description}
              </p>
            </div>

            <div
              role="tablist"
              aria-label={copy.showcase.eyebrow}
              className="mx-auto mt-6 flex w-fit max-w-full flex-wrap justify-center gap-1 rounded-xl border border-violet-100 bg-violet-50/70 p-1 lg:flex-nowrap"
            >
              {showcaseTabKeys.map((tab, index) => (
                <button
                  key={tab}
                  id={`showcase-tab-${tab}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-controls={`showcase-panel-${tab}`}
                  tabIndex={activeTab === tab ? 0 : -1}
                  onClick={() => setActiveTab(tab)}
                  onKeyDown={(event) => {
                    let nextIndex = index;
                    if (event.key === 'ArrowRight') nextIndex = (index + 1) % showcaseTabKeys.length;
                    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + showcaseTabKeys.length) % showcaseTabKeys.length;
                    if (event.key === 'Home') nextIndex = 0;
                    if (event.key === 'End') nextIndex = showcaseTabKeys.length - 1;
                    if (nextIndex !== index) {
                      event.preventDefault();
                      const nextTab = showcaseTabKeys[nextIndex];
                      setActiveTab(nextTab);
                      document.getElementById(`showcase-tab-${nextTab}`)?.focus();
                    }
                  }}
                  className={cn(
                    'shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-[background-color,color,box-shadow] duration-200 sm:text-sm',
                    activeTab === tab
                      ? 'bg-violet-700 text-white shadow-[0_8px_22px_-12px_rgba(91,33,182,0.9)]'
                      : 'text-slate-600 hover:bg-white/80 hover:text-slate-950',
                  )}
                >
                  {copy.showcase.tabs[tab]}
                </button>
              ))}
            </div>

            <div
              id={`showcase-panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`showcase-tab-${activeTab}`}
              key={activeTab}
              className="mt-8 grid items-center gap-8 animate-[showcase-in_260ms_ease-out_both] xl:grid-cols-[0.62fr_1.38fr] xl:gap-10"
            >
              <div className="flex max-w-[380px] flex-col justify-center">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                    {React.createElement(showcaseIcons[activeTab], {
                      className: 'h-5 w-5 text-violet-700',
                      'aria-hidden': true,
                    })}
                  </span>
                  <h3 className="text-2xl font-bold tracking-[-0.04em] text-slate-950 sm:text-[28px] lg:text-[30px]">
                    {copy.showcase.tabs[activeTab]}
                  </h3>
                </div>
                <ul className="mt-7 space-y-5 sm:mt-8">
                  {copy.showcase.panels[activeTab].body.map((point) => (
                    <li key={point} className="flex gap-3 text-base leading-7 text-slate-700 sm:text-lg">
                      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex aspect-[1.6/1] w-full flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_28px_70px_-42px_rgba(76,29,149,0.45)] xl:ml-4 xl:aspect-auto xl:h-[clamp(460px,36vw,660px)] xl:w-[calc(100%+1rem)]">
                <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="relative min-h-0 flex-1 bg-white">
                  <Image
                    src={copy.showcase.panels[activeTab].image}
                    alt={copy.showcase.panels[activeTab].imageAlt}
                    fill
                    sizes="(max-width: 1279px) 100vw, (max-width: 1679px) 68vw, 1120px"
                    className="object-contain object-center xl:object-cover"
                    priority={activeTab === 'dashboard'}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="scroll-section bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28"
        >
          <div className="mx-auto w-full max-w-[1280px]">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
                {copy.pricing.eyebrow}
              </p>
              <h2 className="mt-3 text-[24px] font-extrabold tracking-[-0.05em] text-slate-950 leading-tight md:text-[36px] lg:text-[44px]">
                {copy.pricing.title}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                {copy.pricing.description}
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-[1180px] grid-cols-1 items-stretch gap-5 md:grid-cols-3 md:gap-6">
              {plans.map((plan) => (
                <PricingCard
                  key={plan.id}
                  plan={plan}
                  copy={copy.pricing}
                  locale={locale}
                  isPopular={plan.name.toLowerCase() === 'growth'}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-section px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
                {copy.faq.eyebrow}
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-slate-900 sm:text-4xl">
                {copy.faq.title}
              </h2>
            </div>

            <div className="mt-10 rounded-[28px] border border-slate-200 bg-white/80 p-3 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.25)] sm:p-5">
              <Accordion.Root type="single" collapsible className="space-y-3">
                {copy.faq.items.map((faq) => (
                  <Accordion.Item
                    key={faq.question}
                    value={faq.question}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80"
                  >
                    <Accordion.Header>
                      <Accordion.Trigger type="button" className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-base font-medium text-slate-900 hover:text-violet-700 sm:px-5 touch-manipulation select-none">
                        <span>{faq.question}</span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-300 data-[state=open]:rotate-180" />
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Content className="accordion-content">
                      <div className="px-4 pb-4 text-sm leading-6 text-slate-600 sm:px-5">
                        {faq.answer}
                      </div>
                    </Accordion.Content>
                  </Accordion.Item>
                ))}
              </Accordion.Root>
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 pt-2 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl rounded-[32px] border border-violet-200 bg-gradient-to-br from-violet-700 via-violet-700 to-indigo-700 px-6 py-12 text-center text-white shadow-[0_30px_80px_-35px_rgba(79,70,229,0.45)] sm:px-8 lg:px-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-100">
              {copy.callToAction.eyebrow}
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.05em] sm:text-4xl">
              {copy.callToAction.title}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-violet-50/90 sm:text-lg">
              {copy.callToAction.description}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-white text-violet-700 hover:bg-violet-50 hover:text-violet-700"
              >
                <Link href="/auth/signup">{copy.nav.startFree}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/30 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              >
                <Link href="/auth/login">{copy.nav.signIn}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#6333EA] px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:pr-8">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden bg-transparent">
                  <Image
                    src="/storefy-LOGO.png"
                    alt={copy.accessibility.logo}
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <span className="text-xl font-semibold tracking-[-0.04em] text-white">
                  Storefy
                </span>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-6 text-violet-100">
                {copy.footer.description}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-100">
                {copy.footer.quickLinks}
              </p>
              <ul className="mt-4 space-y-3 text-sm text-violet-50">
                <li>
                  <Link
                    href="#features"
                    className="transition-colors hover:text-white"
                  >
                    {copy.nav.features}
                  </Link>
                </li>
                <li>
                  <Link
                    href="#how-it-works"
                    className="transition-colors hover:text-white"
                  >
                    {copy.nav.howItWorks}
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="transition-colors hover:text-white"
                  >
                    {copy.nav.pricing}
                  </Link>
                </li>
                <li>
                  <Link
                    href="#faq"
                    className="transition-colors hover:text-white"
                  >
                    {copy.nav.faq}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/login"
                    className="transition-colors hover:text-white"
                  >
                    {copy.nav.signIn}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-100">
                {copy.footer.contact}
              </p>
              <ul className="mt-4 space-y-4 text-sm text-violet-50">
                <li className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-violet-200" />
                  <Link
                    href="/auth/login"
                    className="transition-colors hover:text-white"
                  >
                    {copy.footer.contactViaApp}
                  </Link>
                </li>
                <li className="flex items-center gap-3">
                  <Facebook className="h-4 w-4 text-violet-200" />
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-white"
                  >
                    Facebook
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-violet-200" />
                  <Link href="/" className="transition-colors hover:text-white">
                    {copy.footer.website}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-white/20 pt-5 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-violet-100">
              © {new Date().getFullYear()} Storefy. {copy.footer.allRightsReserved}
            </p>
            <div className="flex items-center gap-3 text-violet-100">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label={copy.accessibility.facebook}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label={copy.accessibility.instagram}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
