'use client';

import * as React from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ProductImage } from '@/types';

interface ImageGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ImageGallery({ images, productName }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [imgErrors, setImgErrors] = React.useState<Set<number>>(new Set());

  const validImages = images.filter((img) => img.url);
  const currentImage = validImages[selectedIndex] || null;

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : validImages.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < validImages.length - 1 ? prev + 1 : 0));
  };

  const handleError = (index: number) => {
    setImgErrors((prev) => new Set(prev).add(index));
  };

  if (validImages.length === 0 || imgErrors.size === validImages.length) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        <span className="text-lg font-semibold text-slate-400">
          {productName.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        {currentImage && !imgErrors.has(selectedIndex) ? (
          <Image
            src={currentImage.url!}
            alt={currentImage.alt_text || productName}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            onError={() => handleError(selectedIndex)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-50 to-sky-50">
            <span className="text-lg font-semibold text-slate-400">
              {productName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {validImages.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-3 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-white/80 shadow-sm hover:bg-white"
              onClick={handlePrevious}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full bg-white/80 shadow-sm hover:bg-white"
              onClick={handleNext}
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {validImages.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {validImages.map((img, index) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={cn(
                'relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all',
                index === selectedIndex
                  ? 'border-violet-500 shadow-sm'
                  : 'border-transparent opacity-70 hover:opacity-100'
              )}
              aria-label={`View image ${index + 1}`}
            >
              <Image
                src={img.url!}
                alt={img.alt_text || `${productName} ${index + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
