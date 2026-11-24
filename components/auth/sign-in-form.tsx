'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { signInSchema, type SignInInput } from '@/lib/validation/auth';
import { AuthCard } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export function SignInForm() {
  const router = useRouter();
  const { isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<SignInInput>>({});
  const [showPassword, setShowPassword] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const rawData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    const validated = signInSchema.safeParse(rawData);
    if (!validated.success) {
      const fieldErrors: Partial<SignInInput> = {};
      for (const issue of validated.error.issues) {
        const field = issue.path[0] as keyof SignInInput;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      setIsSubmitting(false);
      return;
    }

    const supabase = createClient();
    console.trace('[AUTH TRACE] SIGN-IN SUBMIT EXECUTED', {
      pathname: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
    const { error } = await supabase.auth.signInWithPassword({
      email: validated.data.email,
      password: validated.data.password,
    });

    if (error) {
      toast.error(error.message || 'Failed to sign in');
      setIsSubmitting(false);
      return;
    }

    toast.success('Signed in successfully');
    router.push('/dashboard');
  }

  return (
    <AuthCard
      lang="bn"
      title="Storefy-তে সাইন ইন করুন"
      description="আপনার অ্যাকাউন্টে প্রবেশ করতে ইমেইল ও পাসওয়ার্ড লিখুন।"
      className="font-[family-name:var(--font-noto-bengali)]"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="font-medium text-slate-700">ইমেইল ঠিকানা</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            disabled={isSubmitting || isLoading}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "login-email-help login-email-error" : "login-email-help"}
            className="h-12 rounded-xl border-slate-200/90 bg-white px-4 text-base shadow-none focus-visible:border-primary focus-visible:ring-primary/15 sm:text-sm"
          />
          <p id="login-email-help" className="text-xs leading-5 text-muted-foreground">
            আপনার Storefy অ্যাকাউন্টে ব্যবহার করা ইমেইল ঠিকানা লিখুন।
          </p>
          {errors.email && (
            <p id="login-email-error" role="alert" className="text-sm font-medium text-destructive">{errors.email}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="font-medium text-slate-700">পাসওয়ার্ড</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isSubmitting || isLoading}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "login-password-help login-password-error" : "login-password-help"}
              className="h-12 rounded-xl border-slate-200/90 bg-white px-4 pr-12 text-base shadow-none focus-visible:border-primary focus-visible:ring-primary/15 sm:text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 rounded-lg text-slate-500 transition-colors hover:bg-violet-50 hover:text-violet-700 active:scale-100"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখান'}
              disabled={isSubmitting || isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          <p id="login-password-help" className="text-xs leading-5 text-muted-foreground">
            আপনার অ্যাকাউন্টের পাসওয়ার্ড লিখুন।
          </p>
          {errors.password && (
            <p id="login-password-error" role="alert" className="text-sm font-medium text-destructive">{errors.password}</p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-sm font-medium"
            onClick={() => router.push('/auth/forgot-password')}
          >
            পাসওয়ার্ড ভুলে গেছেন?
          </Button>
        </div>
        <Button
          type="submit"
          className="h-12 w-full rounded-xl bg-gradient-to-r from-violet-700 to-indigo-600 font-medium text-white shadow-md shadow-violet-900/20 transition-[filter,box-shadow] duration-150 hover:brightness-105 hover:shadow-lg focus-visible:ring-primary/40 active:scale-100"
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting ? 'সাইন ইন হচ্ছে…' : 'সাইন ইন করুন'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          এখনো অ্যাকাউন্ট নেই?{' '}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 font-medium"
            onClick={() => router.push('/auth/signup')}
          >
            অ্যাকাউন্ট তৈরি করুন
          </Button>
        </p>
      </form>
    </AuthCard>
  );
}



