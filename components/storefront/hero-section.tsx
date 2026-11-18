import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  heading: string;
  subheading: string;
  ctaLabel: string;
  ctaDestination: string;
  imageUrl: string | null;
  primaryColor: string;
}

export function HeroSection({ heading, subheading, ctaLabel, ctaDestination, imageUrl, primaryColor }: HeroSectionProps) {
  const isValidColor = /^#[0-9A-Fa-f]{6}$/.test(primaryColor);
  const bgGradient = isValidColor
    ? `linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}03 100%)`
    : undefined;

  return (
    <section className="relative overflow-hidden">
      {bgGradient && (
        <div className="absolute inset-0 -z-10" style={{ background: bgGradient }} />
      )}
      {isValidColor && (
        <div
          className="absolute inset-0 -z-10 opacity-[0.03]"
          style={{
            background: `radial-gradient(circle at 80% 20%, ${primaryColor}, transparent 50%)`,
          }}
        />
      )}
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8 lg:pb-24 lg:pt-16">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-x-16 lg:gap-y-0 lg:items-center">
          <div className="order-1 max-w-2xl lg:col-start-1 lg:row-start-1">
            {heading && (
              <h1 className="text-4xl font-bold tracking-[-0.04em] text-slate-900 sm:text-5xl lg:text-6xl">
                {heading}
              </h1>
            )}
            {subheading && (
              <p className="mt-6 text-base leading-7 text-slate-600 sm:text-lg">
                {subheading}
              </p>
            )}
          </div>
          <div className="order-2 relative lg:col-start-2 lg:row-start-1 lg:row-span-2">
            {imageUrl ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-2xl shadow-black/10">
                <Image
                  src={imageUrl}
                  alt={heading || 'Store hero'}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            ) : (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-16 w-16 rounded-full bg-slate-200 flex items-center justify-center">
                    <span className="text-2xl font-bold text-slate-400">
                      {(heading || 'S').charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="order-3 mt-1 flex justify-center lg:order-none lg:col-start-1 lg:row-start-2 lg:mt-8 lg:justify-start">
            <Button asChild size="lg" style={isValidColor ? { backgroundColor: primaryColor } : undefined}>
              <Link href={ctaDestination || './products'}>
                {ctaLabel || 'Explore Products'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
