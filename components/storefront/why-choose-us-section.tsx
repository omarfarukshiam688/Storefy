import type { WhyChooseUsSectionConfig } from '@/types';

interface WhyChooseUsSectionProps {
  config: WhyChooseUsSectionConfig;
}

export function WhyChooseUsSection({ config }: WhyChooseUsSectionProps) {
  const heading = config.heading || 'Why Choose Us';
  const description = config.description || '';
  const benefits = config.benefits || [];

  if (benefits.length === 0) return null;

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

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="rounded-xl border border-border bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                <span className="text-sm font-semibold">{benefit.title?.charAt(0) || '•'}</span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {benefit.title || ''}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {benefit.description || ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
