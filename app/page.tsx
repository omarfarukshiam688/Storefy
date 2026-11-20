import { cookies } from 'next/headers';
import {
  LandingPage,
  type MarketingPlan,
} from '@/components/marketing/landing-page';
import {
  MARKETING_LOCALE_COOKIE,
  type MarketingLocale,
} from '@/components/marketing/marketing-copy';
import { createServiceClient } from '@/lib/supabase/admin';

export default async function Home() {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get(MARKETING_LOCALE_COOKIE)?.value;
  const initialLocale: MarketingLocale =
    savedLocale === 'bn' || savedLocale === 'en' ? savedLocale : 'en';

  const { data: activePlans, error } = await createServiceClient()
    .from('plans')
    .select(
      'id, name, description, price_monthly, product_limit, archived_product_limit, order_limit, storage_limit_bytes, features',
    )
    .eq('is_active', true)
    .order('price_monthly', { ascending: true })
    .returns<MarketingPlan[]>();

  if (error) {
    throw new Error(`Failed to load marketing pricing plans: ${error.message}`);
  }

  const expectedPlanNames = new Set(['starter', 'growth', 'business']);
  const plans = (activePlans ?? []).filter((plan) =>
    expectedPlanNames.has(plan.name.toLowerCase()),
  );
  const planNames = new Set(plans.map((plan) => plan.name.toLowerCase()));
  if (
    plans.length !== expectedPlanNames.size ||
    [...expectedPlanNames].some((name) => !planNames.has(name))
  ) {
    throw new Error(
      'Marketing pricing requires active Starter, Growth, and Business plans.',
    );
  }

  return <LandingPage initialLocale={initialLocale} plans={plans} />;
}
