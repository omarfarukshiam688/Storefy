import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-4">
          Storefy
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Multi-tenant SaaS platform for small businesses.
        </p>
        <div className="mt-6 flex gap-4">
          <Link
            href="/auth/login"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Get started
          </Link>
        </div>
      </div>
    </main>
  );
}
