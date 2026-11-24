'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { signUpSchema, type SignUpInput } from '@/lib/validation/auth';
import { LEGAL_POLICY_VERSIONS } from '@/lib/legal/policy-versions';
import { notifyUserSignup } from '@/app/actions/notifications';
import { AuthCard } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export function SignUpForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<SignUpInput>>({});
  const [success, setSuccess] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isConsentOpen, setIsConsentOpen] = React.useState(false);
  const [hasAcceptedPolicies, setHasAcceptedPolicies] = React.useState(false);
  const [pendingSignup, setPendingSignup] = React.useState<SignUpInput | null>(null);
  const signupRequestInProgress = React.useRef(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || isConsentOpen) return;

    setErrors({});
    setSuccess(false);

    const formData = new FormData(event.currentTarget);
    const rawData = {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      name: String(formData.get('name') ?? ''),
    };

    const validated = signUpSchema.safeParse(rawData);
    if (!validated.success) {
      const fieldErrors: Partial<SignUpInput> = {};
      for (const issue of validated.error.issues) {
        const field = issue.path[0] as keyof SignUpInput;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setPendingSignup(validated.data);
    setHasAcceptedPolicies(false);
    setIsConsentOpen(true);
  }

  function handleConsentOpenChange(open: boolean) {
    if (isSubmitting) return;
    setIsConsentOpen(open);
    if (!open) {
      setHasAcceptedPolicies(false);
      setPendingSignup(null);
    }
  }

  async function createAccountAfterConsent() {
    if (!pendingSignup || !hasAcceptedPolicies || signupRequestInProgress.current) return;

    signupRequestInProgress.current = true;
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: pendingSignup.email,
        password: pendingSignup.password,
        options: {
          data: {
            name: pendingSignup.name,
            legal_consent: {
              privacy_accepted: true,
              privacy_policy_version: LEGAL_POLICY_VERSIONS.privacy,
              terms_accepted: true,
              terms_version: LEGAL_POLICY_VERSIONS.terms,
            },
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(getSignupErrorMessage(error.message));
        return;
      }

      if (data.user?.id) {
        void notifyUserSignup(data.user.id, pendingSignup.email, pendingSignup.name).catch((notificationError: unknown) => {
          console.error('Failed to send signup notification', notificationError);
        });
      }

      setSuccess(true);
      setIsConsentOpen(false);
      setHasAcceptedPolicies(false);
      setPendingSignup(null);
      toast.success('অ্যাকাউন্ট তৈরি হয়েছে। ইমেইল যাচাইয়ের নির্দেশনা দেখুন।');
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।';
      toast.error(message);
    } finally {
      signupRequestInProgress.current = false;
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <AuthCard
        lang="bn"
        title="আপনার ইমেইল যাচাই করুন"
        description="যাচাইকরণ লিংক পাঠানো হয়েছে। ইনবক্স দেখুন এবং ইমেইল ঠিকানা যাচাই করতে লিংকটি খুলুন।"
        className="max-w-[540px] font-[family-name:var(--font-noto-bengali)]"
      >
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full rounded-xl border-slate-200 font-medium"
          onClick={() => router.push('/auth/login')}
        >
          সাইন-ইন পেজে ফিরুন
        </Button>
      </AuthCard>
    );
  }

  return (
    <>
      <AuthCard
        lang="bn"
        title="Storefy অ্যাকাউন্ট তৈরি করুন"
        description="আপনার ব্যবসার অ্যাকাউন্ট তৈরি করতে নিচের তথ্যগুলো পূরণ করুন।"
        className="max-w-[540px] font-[family-name:var(--font-noto-bengali)]"
      >
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <div className="space-y-2.5">
              <Label htmlFor="name" className="text-sm font-medium text-slate-700">পূর্ণ নাম</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="আপনার নাম"
                autoComplete="name"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "signup-name-help signup-name-error" : "signup-name-help"}
                className="h-12 rounded-xl border-slate-200/90 bg-white px-4 text-base shadow-none focus-visible:border-primary focus-visible:ring-primary/15 sm:text-sm"
              />
              <p id="signup-name-help" className="text-xs leading-5 text-muted-foreground">
                আপনার অ্যাকাউন্টে যে পূর্ণ নামটি ব্যবহার করবেন সেটি লিখুন।
              </p>
              {errors.name && (
                <p id="signup-name-error" role="alert" className="text-sm font-medium text-destructive">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">ইমেইল ঠিকানা</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "signup-email-help signup-email-error" : "signup-email-help"}
                className="h-12 rounded-xl border-slate-200/90 bg-white px-4 text-base shadow-none focus-visible:border-primary focus-visible:ring-primary/15 sm:text-sm"
              />
              <p id="signup-email-help" className="text-xs leading-5 text-muted-foreground">
                যাচাইকরণ বার্তা পেতে আপনি যে ইমেইলটি খুলতে পারেন সেটি দিন।
              </p>
              {errors.email && (
                <p id="signup-email-error" role="alert" className="text-sm font-medium text-destructive">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2.5 sm:col-span-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">পাসওয়ার্ড</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="কমপক্ষে ৮ অক্ষর"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "signup-password-help signup-password-error" : "signup-password-help"}
                  className="h-12 rounded-xl border-slate-200/90 bg-white px-4 pr-12 text-base shadow-none focus-visible:border-primary focus-visible:ring-primary/15 sm:text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-lg text-slate-500 transition-colors hover:bg-violet-50 hover:text-violet-700 active:scale-100"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখান'}
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p id="signup-password-help" className="text-xs leading-5 text-muted-foreground">
                পাসওয়ার্ডে অন্তত ৮টি এবং সর্বোচ্চ ২৫৫টি অক্ষর থাকতে হবে।
              </p>
              {errors.password && (
                <p id="signup-password-error" role="alert" className="text-sm font-medium text-destructive">
                  {errors.password}
                </p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-gradient-to-r from-violet-700 to-indigo-600 font-medium text-white shadow-md shadow-violet-900/20 transition-[filter,box-shadow] duration-150 hover:brightness-105 hover:shadow-lg focus-visible:ring-primary/40 active:scale-100"
            disabled={isSubmitting}
          >
            অ্যাকাউন্ট তৈরি করুন
          </Button>

          <div className="flex items-center justify-center gap-1 text-sm">
            <span className="text-muted-foreground">ইতোমধ্যে অ্যাকাউন্ট আছে?</span>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 font-medium text-primary"
              onClick={() => router.push('/auth/login')}
            >
              সাইন-ইন করুন
            </Button>
          </div>
        </form>
      </AuthCard>

      <Dialog open={isConsentOpen} onOpenChange={handleConsentOpenChange}>
        <DialogContent
          closeDisabled={isSubmitting}
          closeLabel="বন্ধ করুন"
          className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto border-violet-100 p-5 sm:max-w-lg sm:p-7"
          onEscapeKeyDown={(event) => {
            if (isSubmitting) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (isSubmitting) event.preventDefault();
          }}
        >
          <DialogHeader className="pr-7">
            <DialogTitle className="text-xl font-bold text-slate-950">
              আপনার সম্মতি প্রয়োজন
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-7 text-slate-600">
              Storefy-তে অ্যাকাউন্ট তৈরি করার আগে আমাদের গোপনীয়তা নীতি এবং ব্যবহারের শর্তাবলি পড়ে নিন। অ্যাকাউন্ট তৈরি করতে হলে আপনাকে এই দুটি নীতিতে সম্মতি দিতে হবে।
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex flex-col gap-2 rounded-xl border border-violet-100 bg-violet-50/70 p-4 text-sm">
              <Link
                href="/privacy-policy"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-violet-800 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                গোপনীয়তা নীতি
              </Link>
              <Link
                href="/terms"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-violet-800 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                ব্যবহারের শর্তাবলি
              </Link>
            </div>

            <label
              htmlFor="policy-consent"
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-7 text-slate-700 focus-within:ring-2 focus-within:ring-violet-500"
            >
              <input
                id="policy-consent"
                type="checkbox"
                checked={hasAcceptedPolicies}
                onChange={(event) => setHasAcceptedPolicies(event.target.checked)}
                disabled={isSubmitting}
                aria-required="true"
                className="mt-1 h-4 w-4 shrink-0 accent-violet-700"
              />
              <span>
                আমি Storefy-এর গোপনীয়তা নীতি এবং ব্যবহারের শর্তাবলি পড়েছি ও তাতে সম্মতি দিচ্ছি।
              </span>
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => handleConsentOpenChange(false)}
              disabled={isSubmitting}
            >
              ফিরে যান
            </Button>
            <Button
              type="button"
              className="min-h-11 bg-violet-700 hover:bg-violet-800"
              onClick={createAccountAfterConsent}
              disabled={!hasAcceptedPolicies || isSubmitting}
            >
              {isSubmitting ? 'অ্যাকাউন্ট তৈরি হচ্ছে…' : 'সম্মতি দিয়ে অ্যাকাউন্ট তৈরি করুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getSignupErrorMessage(message: string): string {
  if (/already registered|already exists/i.test(message)) {
    return 'এই ইমেইল দিয়ে একটি অ্যাকাউন্ট আছে। সাইন-ইন করুন বা পাসওয়ার্ড পুনরুদ্ধার করুন।';
  }
  if (/password/i.test(message)) {
    return 'পাসওয়ার্ডটি গ্রহণ করা যায়নি। অন্য একটি পাসওয়ার্ড দিয়ে চেষ্টা করুন।';
  }
  if (/email/i.test(message)) {
    return 'ইমেইল ঠিকানাটি যাচাই করুন এবং আবার চেষ্টা করুন।';
  }
  return 'অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।';
}
