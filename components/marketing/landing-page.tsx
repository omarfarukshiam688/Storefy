'use client';

import * as React from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import Image from 'next/image';
import Link from 'next/link';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Facebook,
  Globe,
  Instagram,
  LayoutDashboard,
  Mail,
  Menu,
  Package,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tag,
  Users,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, PremiumCard } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LandingHero } from './landing-hero';

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

const problemCards = [
  {
    index: '01',
    title: 'Orders Everywhere',
    description:
      'Orders scattered across messages, comments and notes become harder to keep track of as your business grows.',
  },
  {
    index: '02',
    title: 'Manual Product Management',
    description:
      'Managing products manually becomes time-consuming when your catalog starts getting bigger.',
  },
  {
    index: '03',
    title: 'No Professional Storefront',
    description:
      'Your social page may bring customers in, but your business deserves a professional place of its own.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Create your store',
    description:
      'Set up your Storefy workspace and get your business organized.',
  },
  {
    number: '02',
    title: 'Add your products',
    description: 'Build your catalog and organize your products in one place.',
  },
  {
    number: '03',
    title: 'Manage your business',
    description:
      'Keep your products and operations organized from a single dashboard.',
  },
  {
    number: '04',
    title: 'Grow your brand',
    description: 'Give customers a more professional online experience.',
  },
];

const featureItems = [
  {
    icon: Package,
    title: 'Product Management',
    description:
      'Keep inventory, pricing, and product details organized in one place.',
  },
  {
    icon: ShoppingCart,
    title: 'Order Management',
    description:
      'Track order flow and keep your store operations clear and structured.',
  },
  {
    icon: Store,
    title: 'Storefront',
    description:
      'Give customers a clean, professional storefront experience for your brand.',
  },
  {
    icon: Tag,
    title: 'Product Categories',
    description:
      'Group products into categories to keep your catalog easy to browse.',
  },
  {
    icon: LayoutDashboard,
    title: 'Business Dashboard',
    description:
      'Manage your company workspace with a focused operational dashboard.',
  },
  {
    icon: Building2,
    title: 'Multi-tenant Store Management',
    description:
      'Support multiple store contexts within one secure, tenant-aware workspace.',
  },
];

const showcaseTabs = [
  'Products',
  'Orders',
  'Storefront',
  'Customers',
  'Analytics',
  'Settings',
] as const;
type ShowcaseTab = (typeof showcaseTabs)[number];

const showcasePanels: Record<
  ShowcaseTab,
  { title: string; subtitle: string; body: string[] }
> = {
  Products: {
    title: 'Product management',
    subtitle: 'Organize your food catalog with clarity.',
    body: [
      'Create and update product listings for your daily bestsellers and seasonal items.',
      'Group foods into clear categories so customers can browse faster.',
      'Keep pricing, availability, and product details aligned in one place.',
    ],
  },
  Orders: {
    title: 'Order workflow',
    subtitle: 'Keep delivery and pickup organized.',
    body: [
      'Track incoming orders from message to delivery without losing the thread.',
      'Review and manage order flow more neatly as your business grows.',
      'Keep your daily store operations clear and easy to manage.',
    ],
  },
  Storefront: {
    title: 'Storefront',
    subtitle: 'Give customers a cleaner digital storefront.',
    body: [
      'Present your products with a more professional online storefront experience.',
      'Showcase your food business in a format customers can trust and browse easily.',
      'Create a polished home for your brand without building everything from scratch.',
    ],
  },
  Customers: {
    title: 'Customers',
    subtitle: 'Stay close to repeat buyers and local regulars.',
    body: [
      'Keep customer information organized so repeat orders are easier to manage.',
      'Track what customers buy most and respond faster to demand.',
      'Build a stronger repeat-order experience as your business grows.',
    ],
  },
  Analytics: {
    title: 'Analytics',
    subtitle: 'Understand what is performing well.',
    body: [
      'Monitor your top-selling products and order patterns without guesswork.',
      'Review your store activity in a simpler, more actionable view.',
      'Make better day-to-day decisions based on what your business is actually selling.',
    ],
  },
  Settings: {
    title: 'Business settings',
    subtitle: 'Keep the shop setup clean and simple.',
    body: [
      'Manage your store identity, contact information, and business details in one place.',
      'Adjust your business setup without leaving the main workspace.',
      'Keep your store configuration organized and ready for growth.',
    ],
  },
};

const useCases = [
  {
    title: 'Home-Based Food Businesses',
    description:
      'Keep everyday production, pricing, and orders in one place without the chaos of scattered messages.',
  },
  {
    title: 'Facebook Sellers',
    description:
      'Turn social sales into a cleaner system that feels more professional and easier to manage.',
  },
  {
    title: 'Small Retailers',
    description:
      'Give your shop a more structured workflow for inventory, products, and customer orders.',
  },
  {
    title: 'Growing Online Brands',
    description:
      'Move from manual work to a more organized online storefront as demand grows.',
  },
];

const trustSignals = [
  'Simple setup',
  'Organized business management',
  'Professional storefront experience',
  'One dedicated workspace',
];

const faqs = [
  {
    question: 'What is Storefy?',
    answer:
      'Storefy is a multi-tenant SaaS platform that helps small businesses turn their Facebook-based business into a professional online store. You can manage your products, storefront, business settings, and day-to-day operations from one place.',
  },
  {
    question: 'Who is Storefy for?',
    answer:
      'Storefy is built for small businesses, home-based sellers, Facebook sellers, and growing brands that want a professional online storefront without the cost and complexity of building one from scratch.',
  },
  {
    question: 'Do I need coding knowledge?',
    answer:
      'No. Storefy is designed for business owners, not developers. You can set up your store, manage products, customize your storefront, and manage your business from the dashboard without writing code.',
  },
  {
    question: 'How does Storefy work?',
    answer:
      'Create your Storefy workspace, set up your store, add your products, customize your storefront, and start sharing it with your customers. Storefy provides the dashboard and storefront infrastructure so you can focus on running your business.',
  },
  {
    question: 'Can I manage my products from Storefy?',
    answer:
      'Yes. You can create, edit, organize, feature, archive, and manage your products from the Storefy dashboard. Your product information and images are connected to your storefront, so updates can be managed from one place.',
  },
  {
    question: 'Can I start for free?',
    answer:
      'Yes. You can start with Storefy without an upfront cost. Free and trial access comes with usage limits, while paid plans can provide higher limits and additional features as your business grows.',
  },
  {
    question: 'Can I manage my store from one dashboard?',
    answer:
      'Yes. Storefy brings your store management into one dashboard, giving you a central place to manage products, storefront settings, branding, and other business operations instead of handling everything separately.',
  },
];

function Logo() {
  return (
    <div className="flex items-center">
      <div className="relative h-11 w-[88px] overflow-hidden bg-transparent sm:h-12 sm:w-24">
        <Image
          src="/storefy-LOGO.png"
          alt="Storefy logo"
          width={180}
          height={90}
          className="h-full w-full object-contain"
          priority
        />
      </div>
    </div>
  );
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
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
        aria-label="Close navigation"
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
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between pb-4">
          <Logo />
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="mt-8 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex min-h-12 items-center justify-between rounded-xl border border-transparent px-4 py-3.5 text-base font-medium text-slate-800 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-slate-900 touch-manipulation select-none"
            >
              {item.label}
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
          ))}
        </nav>

        <div className="mt-8 space-y-3 border-t border-slate-200 pt-5">
          <Link
            href="/auth/login"
            className="block text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            Sign in
          </Link>
          <Button asChild className="w-full" size="lg">
            <Link href="/auth/signup">Start Free</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [activeTab, setActiveTab] = React.useState<ShowcaseTab>('Products');
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

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
    <div className="min-h-screen bg-atmosphere-gradient text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/65 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="Storefy home"
            className="flex items-center"
          >
            <Logo />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
            >
              Sign in
            </Link>
            <Button asChild size="lg">
              <Link href="/auth/signup">Start Free</Link>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="relative z-50 lg:hidden touch-manipulation"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <MobileNav open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="overflow-x-hidden">
        <LandingHero />

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
                The problem
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-slate-900 sm:text-4xl">
                Your Business Has Grown. Your Workflow Should Too.
              </h2>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {problemCards.map((card) => (
                <Card
                  key={card.index}
                  className="group h-full border-slate-200/80 bg-white/70 p-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.3)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_25px_60px_-25px_rgba(76,29,149,0.24)]"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
                      {card.index}
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {card.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
                Solution
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-slate-900 sm:text-4xl">
                One Simple Workspace. A Better Way to Run Your Store.
              </h2>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[28px] border border-slate-200 bg-white/80 p-4 shadow-[0_20px_50px_-30px_rgba(76,29,149,0.28)] sm:p-5">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-3 sm:p-4">
                  <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-sky-500 text-white">
                        <Store className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
                          Storefy
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          Business dashboard
                        </p>
                      </div>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                      Active
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[170px_1fr]">
                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
                      {[
                        'Products',
                        'Orders',
                        'Storefront',
                        'Business Settings',
                      ].map((item) => (
                        <div
                          key={item}
                          className="rounded-xl bg-slate-50 px-2.5 py-2 text-sm text-slate-600"
                        >
                          {item}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-700">
                            Best sellers
                          </p>
                          <div className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-medium text-violet-700">
                            Updated
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          {['Tea set', 'Soap gift', 'Journal'].map((item) => (
                            <div
                              key={item}
                              className="rounded-xl bg-slate-50 p-2 text-center"
                            >
                              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-sky-100 text-violet-700">
                                <Package className="h-4 w-4" />
                              </div>
                              <p className="mt-2 text-xs font-medium text-slate-700">
                                {item}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                            Orders
                          </p>
                          <p className="mt-2 text-xl font-bold text-slate-900">
                            24 pending
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                            Store
                          </p>
                          <p className="mt-2 text-xl font-bold text-slate-900">
                            Ready
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center gap-4">
                <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
                    Products
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Maintain your catalog from one organized workspace.
                  </p>
                </div>
                <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                    Orders
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Keep fulfillment visible without losing the thread of each
                    order.
                  </p>
                </div>
                <div className="rounded-2xl border border-violet-200 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
                    Storefront
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Give customers a cleaner, more professional buying
                    experience.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                    Business Settings
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Keep the core operational details of your business aligned.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
                How it works
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-slate-900 sm:text-4xl">
                A simple path from business setup to growth.
              </h2>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="group rounded-[26px] border border-slate-200 bg-white/80 p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)] transition-transform duration-200 hover:-translate-y-1"
                >
                  <div className="mb-6 flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">
                      {step.number}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
                Features
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-slate-900 sm:text-4xl">
                Everything your store needs, without the overhead.
              </h2>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featureItems.map(({ icon: Icon, title, description }) => (
                <PremiumCard
                  key={title}
                  className="group h-full border-slate-200/80 bg-white/75 p-6 transition-transform duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_24px_60px_-30px_rgba(76,29,149,0.3)]"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-500 to-sky-500 text-white shadow-sm shadow-violet-200/60">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {description}
                  </p>
                </PremiumCard>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
                Product showcase
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-slate-900 sm:text-4xl">
                Everything Your Store Needs. Right Where You Need It.
              </h2>
            </div>

            <div className="mt-10 overflow-hidden rounded-[30px] border border-slate-200 bg-white/75 p-4 shadow-[0_28px_80px_-35px_rgba(76,29,149,0.32)] backdrop-blur-sm sm:p-5">
              <div className="flex flex-wrap gap-2 rounded-2xl border border-violet-100 bg-violet-50/70 p-2">
                {showcaseTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'rounded-xl px-3 py-2 text-sm font-medium transition-all',
                      activeTab === tab
                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-violet-100'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                    aria-pressed={activeTab === tab}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-sky-500 text-white">
                        <Store className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                          Store
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          Dhaka Kitchen House
                        </p>
                      </div>
                    </div>
                    <div className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-medium text-violet-700">
                      {activeTab}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.15em] text-slate-400">
                        <span>Catalog</span>
                        <span>Live</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {['Mango Pickle', 'Jalpai Pickle', 'Amsotto'].map(
                          (name, index) => (
                            <div
                              key={name}
                              className="flex items-center justify-between rounded-xl bg-slate-50 px-2.5 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    'flex h-7 w-7 items-center justify-center rounded-md text-white',
                                    index % 2 === 0
                                      ? 'bg-violet-500'
                                      : 'bg-sky-500'
                                  )}
                                >
                                  <Package className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-sm font-medium text-slate-700">
                                  {name}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500">
                                ৳
                                {index === 0
                                  ? '290'
                                  : index === 1
                                    ? '320'
                                    : '250'}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.15em] text-slate-400">
                        <span>Updates</span>
                        <span>Today</span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {[
                          { label: 'Orders', value: '21' },
                          { label: 'Customers', value: '46' },
                          { label: 'Stock', value: 'Good' },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between rounded-xl bg-slate-50 px-2.5 py-2"
                          >
                            <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                              {item.label}
                            </span>
                            <span className="text-sm font-semibold text-slate-900">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="flex flex-col justify-center rounded-[24px] border border-slate-200 bg-white p-5"
                  key={activeTab}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
                    {activeTab}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                    {showcasePanels[activeTab].title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {showcasePanels[activeTab].subtitle}
                  </p>
                  <ul className="mt-5 space-y-3">
                    {showcasePanels[activeTab].body.map((point) => (
                      <li
                        key={point}
                        className="flex gap-3 text-sm leading-6 text-slate-700"
                      >
                        <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                          <Check className="h-3 w-3" />
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
                Use cases
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-slate-900 sm:text-4xl">
                Built for Businesses Ready to Grow.
              </h2>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {useCases.map((item) => (
                <Card
                  key={item.title}
                  className="group h-full border-slate-200/80 bg-white/80 p-6 transition-transform duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_24px_60px_-30px_rgba(76,29,149,0.26)]"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 via-white to-sky-100 text-violet-700 shadow-sm">
                    <Users className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-[30px] border border-violet-200 bg-gradient-to-br from-violet-600 via-indigo-500 to-sky-500 p-6 text-white shadow-[0_30px_80px_-30px_rgba(79,70,229,0.4)] sm:p-8 lg:p-10">
              <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-100">
                    Value
                  </p>
                  <h2 className="mt-3 text-3xl font-bold tracking-[-0.05em] sm:text-4xl">
                    A cleaner way to grow your business online.
                  </h2>
                </div>
                <div className="rounded-[24px] border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-sm text-violet-50">
                    Build a clearer store workflow with:
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {trustSignals.map((signal) => (
                      <div
                        key={signal}
                        className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/90"
                      >
                        {signal}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-5 lg:grid-cols-4">
              {trustSignals.map((signal) => (
                <div
                  key={signal}
                  className="rounded-[24px] border border-slate-200 bg-white/80 p-5 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.26)]"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-900">
                    {signal}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 pt-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl rounded-[32px] border border-violet-200 bg-gradient-to-br from-violet-600 via-indigo-500 to-sky-500 px-6 py-12 text-center text-white shadow-[0_35px_90px_-35px_rgba(79,70,229,0.5)] sm:px-8 lg:px-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-100">
              Ready to begin
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.05em] sm:text-4xl">
              Ready to Give Your Business a Better Home Online?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-violet-50/90 sm:text-lg">
              Start building your Storefy workspace and bring your business into
              a more organized online experience.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-white text-violet-700 hover:bg-violet-50 hover:text-violet-700"
              >
                <Link href="/auth/signup">Start Free</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/30 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              >
                <Link href="/auth/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="faq" className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
                FAQ
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-slate-900 sm:text-4xl">
                Questions, answered clearly.
              </h2>
            </div>

            <div className="mt-10 rounded-[28px] border border-slate-200 bg-white/80 p-3 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.25)] sm:p-5">
              <Accordion.Root type="single" collapsible className="space-y-3">
                {faqs.map((faq) => (
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
      </main>

      <footer className="bg-[#6333EA] px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:pr-8">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden bg-transparent">
                  <Image
                    src="/storefy-LOGO.png"
                    alt="Storefy logo"
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
                Storefy helps small businesses turn Facebook-based selling into
                a professional online store — with products, orders, and
                storefront management in one place.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-100">
                Quick Links
              </p>
              <ul className="mt-4 space-y-3 text-sm text-violet-50">
                <li>
                  <Link
                    href="#features"
                    className="transition-colors hover:text-white"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#how-it-works"
                    className="transition-colors hover:text-white"
                  >
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="transition-colors hover:text-white"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="#faq"
                    className="transition-colors hover:text-white"
                  >
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/login"
                    className="transition-colors hover:text-white"
                  >
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-100">
                Get in Touch
              </p>
              <ul className="mt-4 space-y-4 text-sm text-violet-50">
                <li className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-violet-200" />
                  <Link
                    href="/auth/login"
                    className="transition-colors hover:text-white"
                  >
                    Contact via app
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
                    Storefy website
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-white/20 pt-5 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-violet-100">
              © {new Date().getFullYear()} Storefy. All rights reserved.
            </p>
            <div className="flex items-center gap-3 text-violet-100">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
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
