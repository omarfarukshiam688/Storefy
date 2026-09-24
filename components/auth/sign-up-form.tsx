'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { signUpSchema, type SignUpInput } from '@/lib/validation/auth';
import { notifyUserSignup } from '@/app/actions/notifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export function SignUpForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<SignUpInput>>({});
  const [success, setSuccess] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setSuccess(false);

    const formData = new FormData(event.currentTarget);
    const rawData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      name: formData.get('name') as string,
    };

    const validated = signUpSchema.safeParse(rawData);
    if (!validated.success) {
      const fieldErrors: Partial<SignUpInput> = {};
      for (const issue of validated.error.issues) {
        const field = issue.path[0] as keyof SignUpInput;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      setIsSubmitting(false);
      return;
    }

    const supabase = createClient();
    console.log('[AUTH TRACE] SIGN-UP CALLED', {
      pathname: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
    const { data, error } = await supabase.auth.signUp({
      email: validated.data.email,
      password: validated.data.password,
      options: {
        data: {
          name: validated.data.name,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    console.log('[AUTH TRACE] SIGN-UP RESULT', {
      pathname: window.location.pathname,
      hasUser: Boolean(data?.user),
      hasSession: Boolean(data?.session),
      errorMessage: error?.message,
      errorStatus: error?.status,
    });

    console.log('[Auth Debug] signup result', {
      hasUser: Boolean(data?.user),
      hasSession: Boolean(data?.session),
      errorMessage: error?.message,
      errorStatus: error?.status,
    });

    if (error) {
      toast.error(error.message || 'Failed to sign up');
      setIsSubmitting(false);
      return;
    }

    if (data.user?.id) {
      notifyUserSignup(data.user.id, validated.data.email, validated.data.name).catch(() => {});
    }

    setSuccess(true);
    toast.success('Account created. Please check your email to verify.');
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Check your email
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            We&apos;ve sent you a verification link. Please check your inbox and
            click the link to verify your email address.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full h-11"
          onClick={() => router.push('/login')}
        >
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Sign up</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Create your account to get started with Storefy
        </p>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Full Name */}
        <div className="space-y-2.5">
          <Label htmlFor="name" className="text-sm font-medium">
            Full name
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="John Doe"
            autoComplete="name"
            disabled={isSubmitting}
            className="h-11 px-4 text-base"
          />
          {errors.name && (
            <p className="text-sm font-medium text-destructive">
              {errors.name}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2.5">
          <Label htmlFor="email" className="text-sm font-medium">
            Email address
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            disabled={isSubmitting}
            className="h-11 px-4 text-base"
          />
          {errors.email && (
            <p className="text-sm font-medium text-destructive">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2.5">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isSubmitting}
              className="h-11 px-4 text-base pr-11"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 px-0 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={isSubmitting}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {errors.password && (
            <p className="text-sm font-medium text-destructive">
              {errors.password}
            </p>
          )}
        </div>

        {/* Terms and Privacy */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          By creating an account, you agree to our{' '}
          <button
            type="button"
            onClick={() => window.open('/terms', '_blank')}
            className="font-medium text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
          >
            Terms of Service
          </button>{' '}
          and{' '}
          <button
            type="button"
            onClick={() => window.open('/privacy', '_blank')}
            className="font-medium text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
          >
            Privacy Policy
          </button>
        </p>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-11 text-base font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating account...' : 'Get started'}
        </Button>

        {/* Sign In Link */}
        <div className="flex items-center justify-center gap-1 text-sm">
          <span className="text-muted-foreground">
            Already have an account?
          </span>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 font-semibold text-foreground hover:text-primary"
            onClick={() => router.push('/login')}
          >
            Sign in
          </Button>
        </div>
      </form>
    </div>
  );
}
