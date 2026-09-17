'use client';

import * as React from 'react';
import Image from 'next/image';
import lottie from 'lottie-web';
import loginAnimation from '@/login.json';

export function AuthPanel() {
  const animationRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!animationRef.current) return;

    const instance = lottie.loadAnimation({
      container: animationRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: loginAnimation,
    });

    return () => instance.destroy();
  }, []);

  return (
    <div className="relative hidden h-screen w-full flex-col overflow-hidden bg-gradient-to-br from-[#47b9f6] via-[#5b7ef5] to-[#4a5ae4] text-white lg:flex">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.25),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_30%)]" />

      <div className="relative z-10 flex h-full flex-col justify-between px-8 py-7">
        <div className="flex items-center pl-1">
          <div className="relative h-20 w-36 overflow-hidden bg-transparent sm:h-24 sm:w-40">
            <Image
              src="/storefy-LOGO.png"
              alt="Storefy logo"
              width={260}
              height={120}
              className="h-full w-full object-contain"
              priority
            />
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[560px] flex-col items-center justify-center px-4">
          <div className="relative flex h-[440px] w-full max-w-[500px] items-center justify-center overflow-hidden rounded-[28px] bg-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-[2px]">
            <div className="absolute h-[330px] w-[330px] rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-32 w-44 -translate-x-1/2 rounded-t-[140px] bg-white/6 blur-2xl" />

            <div
              ref={animationRef}
              className="relative z-10 h-[360px] w-[360px] scale-[1.02]"
              aria-label="Storefy animation illustration"
            />
          </div>

          <div className="mt-7 max-w-[470px] text-center">
            <h2 className="text-[2.2rem] font-black leading-[1.05] tracking-[-0.06em] text-white">
              Grow your business with confidence
            </h2>
            <p className="mt-2 text-[1.05rem] font-medium leading-7 text-white/80">
              Manage products, orders, and customers from one organized
              storefront and workspace built for growing businesses.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 px-1 text-[11px] text-white/70">
          <span>Copyright © {new Date().getFullYear()} Storefy</span>
          <span>All rights reserved.</span>
        </div>
      </div>
    </div>
  );
}
