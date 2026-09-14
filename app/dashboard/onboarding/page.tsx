'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createTenantSchema } from '@/lib/validation/tenant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Store } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [slugAvailable, setSlugAvailable] = React.useState<boolean | null>(
    false
  );
  const [defaultPlanId, setDefaultPlanId] = React.useState<string | null>(null);
  const [planError, setPlanError] = React.useState<string | null>(null);

  // Fetch default plan on mount
  React.useEffect(() => {
    const fetchDefaultPlan = async () => {
      try {
        const supabase = createClient();

        // Verify browser-side auth before querying plans
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        console.log('[onboarding] browser auth check', {
          hasUser: !!user,
          userId: user?.id,
          authError: authError?.message,
          authErrorCode: authError?.code,
        });

        // Use .limit(1) without .single() so that an empty result
        // is treated as "no plans" instead of a PostgREST 406 error.
        const { data, error } = await supabase
          .from('plans')
          .select('id')
          .eq('is_active', true)
          .order('price_monthly', { ascending: true })
          .limit(1);

        console.log('[onboarding] plans query result', {
          data,
          errorMessage: error?.message,
          errorCode: error?.code,
          errorDetails: error?.details,
          errorHint: error?.hint,
        });

        if (error) {
          console.error('[onboarding] plans query failed', error);
          setPlanError(
            error.message || 'Failed to load plans. Please try again later.'
          );
          return;
        }

        const plan = data?.[0];
        if (!plan) {
          console.warn('[onboarding] no active plans found');
          setPlanError('No active plans available. Please contact support.');
          return;
        }

        setDefaultPlanId(plan.id);
        setPlanError(null);
      } catch (err) {
        console.error('[onboarding] unexpected plan fetch error:', err);
        setPlanError(
          err instanceof Error
            ? err.message
            : 'Failed to load plans. Please try again later.'
        );
      }
    };

    fetchDefaultPlan();
  }, []);

  // Check slug availability with debounce
  const checkSlugAvailability = React.useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    try {
      const response = await fetch(
        `/api/tenants/check-slug?slug=${encodeURIComponent(slug)}`
      );
      const data = await response.json();
      setSlugAvailable(data.available);
    } catch (error) {
      console.error('Slug check error:', error);
      setSlugAvailable(null);
    }
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      if (!defaultPlanId) {
        toast.error('Plans not loaded. Please refresh and try again.');
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData(event.currentTarget);
      const rawData = {
        name: formData.get('name') as string,
        slug: (formData.get('slug') as string).toLowerCase(),
        plan_id: defaultPlanId,
      };

      // Validate
      const validated = createTenantSchema.safeParse(rawData);
      if (!validated.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of validated.error.issues) {
          fieldErrors[issue.path[0] as string] = issue.message;
        }
        setErrors(fieldErrors);
        setIsSubmitting(false);
        return;
      }

      // Check slug availability before submitting
      if (slugAvailable === false) {
        setErrors({ slug: 'This slug is already taken' });
        setIsSubmitting(false);
        return;
      }

      // Submit
      const response = await fetch('/api/tenants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated.data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Failed to create store');
        setIsSubmitting(false);
        return;
      }

      toast.success('Store created successfully!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  }

  if (planError) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-md text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <Store className="h-6 w-6" />
              </div>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight mb-2">
              Unable to load plans
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {planError}
            </p>
            <Button
              onClick={() => {
                setPlanError(null);
                setDefaultPlanId(null);
                window.location.reload();
              }}
              className="w-full h-11"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!defaultPlanId) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100 items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Store className="h-6 w-6" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Welcome to Storefy
            </h1>
            <p className="text-base text-muted-foreground">
              Let&apos;s create your online store in a few quick steps
            </p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Store Name */}
            <div className="space-y-2.5">
              <Label htmlFor="name" className="text-sm font-semibold">
                Store name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="e.g., My Awesome Store"
                disabled={isSubmitting}
                className="h-11 px-4 text-base"
              />
              {errors.name && (
                <p className="text-sm font-medium text-destructive">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Store Slug */}
            <div className="space-y-2.5">
              <Label htmlFor="slug" className="text-sm font-semibold">
                Store URL slug
              </Label>
              <div className="space-y-1">
                <Input
                  id="slug"
                  name="slug"
                  type="text"
                  placeholder="e.g., my-awesome-store"
                  disabled={isSubmitting}
                  className="h-11 px-4 text-base"
                  onChange={(e) =>
                    checkSlugAvailability(e.target.value.toLowerCase())
                  }
                />
                {slugAvailable === true && (
                  <p className="text-xs text-green-600 font-medium">
                    ✓ Slug available
                  </p>
                )}
                {slugAvailable === false && (
                  <p className="text-xs text-destructive font-medium">
                    ✗ Slug already taken
                  </p>
                )}
              </div>
              {errors.slug && (
                <p className="text-sm font-medium text-destructive">
                  {errors.slug}
                </p>
              )}
            </div>

            {/* Info text */}
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                You can customize your store name and settings anytime from the
                admin dashboard.
              </p>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={isSubmitting || slugAvailable === false}
            >
              {isSubmitting ? 'Creating store...' : 'Create store'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
