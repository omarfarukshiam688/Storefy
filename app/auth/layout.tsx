import { LegalFooterLinks } from '@/components/marketing/legal-footer-links';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-auth-gradient text-slate-900">
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
      <nav
        aria-label="আইনি ও তথ্যবিষয়ক পৃষ্ঠা"
        className="mx-auto w-full max-w-5xl px-4 pb-5 sm:px-6"
      >
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
          <LegalFooterLinks linkClassName="rounded-sm transition-colors hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500" />
        </ul>
      </nav>
    </div>
  );
}