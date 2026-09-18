import type { AboutUsSectionConfig } from '@/types';
import { getAboutImageSignedUrl } from '@/lib/storage';

interface AboutUsSectionProps {
  config: AboutUsSectionConfig;
}

export async function AboutUsSection({ config }: AboutUsSectionProps) {
  const heading = config.heading || 'About Us';
  const description = config.description || '';
  const imagePath = config.image_path || null;
  const imageUrl = imagePath ? await getAboutImageSignedUrl(imagePath, 3600) : null;

  if (!description && !imagePath) return null;

  return (
    <section className="border-t border-slate-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.04em] text-slate-900 sm:text-3xl">
              {heading}
            </h2>
            {description && (
              <p className="mt-4 text-base leading-7 text-slate-600">
                {description}
              </p>
            )}
          </div>
          {imageUrl && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
              <img
                src={imageUrl}
                alt={heading}
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
