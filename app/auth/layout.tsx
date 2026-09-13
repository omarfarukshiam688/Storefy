import { Store } from 'lucide-react';
import { AuthPanel } from '@/components/auth/auth-panel';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left Panel - Hidden on mobile/tablet, shown on lg+ */}
      <div className="hidden lg:flex lg:w-1/2 flex-col">
        <AuthPanel />
      </div>

      {/* Right Panel - Form Section */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12 sm:px-8 lg:w-1/2 lg:p-12">
        {/* Mobile header - Storefy logo shown only on mobile/tablet */}
        <div className="mb-12 flex items-center gap-2 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Store className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Storefy</span>
        </div>

        {/* Form container with controlled width */}
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
