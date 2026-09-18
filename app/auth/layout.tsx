import Image from 'next/image';
import { AuthPanel } from '@/components/auth/auth-panel';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">
      <div className="hidden lg:flex lg:w-[54%] xl:w-[52%]">
        <AuthPanel />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 sm:px-8 lg:w-[46%] lg:p-10 xl:w-[48%]">
        <div className="mb-12 flex items-center justify-center lg:hidden">
          <div className="relative h-14 w-24 overflow-hidden bg-transparent sm:h-16 sm:w-28">
            <Image
              src="/storefy-LOGO.png"
              alt="Storefy logo"
              width={200}
              height={100}
              className="h-full w-full object-contain"
              priority
            />
          </div>
        </div>

        <div className="w-full max-w-[430px]">{children}</div>
      </div>
    </div>
  );
}