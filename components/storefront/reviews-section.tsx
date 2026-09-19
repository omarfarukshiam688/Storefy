import type { ReviewsSectionConfig } from '@/types';

interface ReviewsSectionProps {
  config: ReviewsSectionConfig;
}

export function ReviewsSection({ config }: ReviewsSectionProps) {
  const heading = config.heading || 'Reviews';
  const description = config.description || '';

  return (
    <section className="border-t border-slate-100 bg-slate-50/50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-[-0.04em] text-slate-900 sm:text-3xl">
            {heading}
          </h2>
          {description && (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {description}
            </p>
          )}
        </div>
        <div className="mt-10 rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center transition-all duration-200 hover:border-violet-200 hover:shadow-sm">
          <p className="text-sm text-slate-500">
            Customer reviews will appear here once available.
          </p>
        </div>
      </div>
    </section>
  );
}
