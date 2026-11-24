import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LEGAL_POLICY_LAST_UPDATED } from '@/lib/legal/policy-versions';
import { LegalFooterLinks } from './legal-footer-links';

export function LegalPageLayout({ children }: { children: ReactNode }) {
  return (
    <div lang="bn" className="flex min-h-screen flex-col bg-atmosphere-gradient font-[family-name:var(--font-noto-bengali)] text-slate-800">
      <header className="border-b border-violet-100/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Storefy-এর হোম পেজ" className="shrink-0">
            <Image
              src="/storefy-LOGO.png"
              alt="Storefy"
              width={156}
              height={56}
              priority
              className="h-10 w-auto"
            />
          </Link>
          <nav aria-label="প্রধান নেভিগেশন" className="flex items-center gap-4 text-sm font-medium text-slate-600 sm:gap-6">
            <Link href="/" className="transition-colors hover:text-violet-700">হোম</Link>
            <Link href="/resources" className="transition-colors hover:text-violet-700">রিসোর্স সেন্টার</Link>
          </nav>
        </div>
      </header>

      <main className="min-w-0 flex-1">{children}</main>

      <footer className="mt-16 bg-[#6333EA] px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight text-white">
            Storefy
          </Link>
          <nav aria-label="আইনি ও তথ্যবিষয়ক পৃষ্ঠা">
            <ul className="flex flex-col gap-3 text-sm text-violet-50 sm:flex-row sm:items-center sm:gap-6">
              <LegalFooterLinks />
            </ul>
          </nav>
          <p className="text-xs text-violet-100">© {new Date().getFullYear()} Storefy</p>
        </div>
      </footer>
    </div>
  );
}

export function LegalDocumentMetadata({ version }: { version: string }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
      <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 font-medium text-violet-800">
        সংস্করণ {version}
      </span>
      <time dateTime={LEGAL_POLICY_LAST_UPDATED.iso}>
        সর্বশেষ হালনাগাদ: {LEGAL_POLICY_LAST_UPDATED.display}
      </time>
    </div>
  );
}

export function LegalContactNotice() {
  const email = process.env.LEGAL_CONTACT_EMAIL?.trim();

  if (!email) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
        গোপনীয়তা ও আইনি বিষয়ে যোগাযোগের ইমেইল ঠিকানা প্রকাশের আগে{' '}
        <code className="rounded bg-amber-100 px-1.5 py-0.5">LEGAL_CONTACT_EMAIL</code>{' '}
        কনফিগার করতে হবে।
      </p>
    );
  }

  return (
    <address className="not-italic text-sm leading-7 text-slate-700">
      যোগাযোগের ইমেইল:{' '}
      <a href={`mailto:${email}`} className="font-medium text-violet-700 underline underline-offset-4">
        {email}
      </a>
    </address>
  );
}
