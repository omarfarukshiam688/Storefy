"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validation/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<ForgotPasswordInput>>({});
  const [success, setSuccess] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setSuccess(false);

    const formData = new FormData(event.currentTarget);
    const rawData = {
      email: formData.get("email") as string,
    };

    const validated = forgotPasswordSchema.safeParse(rawData);
    if (!validated.success) {
      const fieldErrors: Partial<ForgotPasswordInput> = {};
      for (const issue of validated.error.issues) {
        const field = issue.path[0] as keyof ForgotPasswordInput;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      setIsSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      validated.data.email,
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      }
    );

    if (error) {
      toast.error(error.message || "Failed to send reset email");
      setIsSubmitting(false);
      return;
    }

    setSuccess(true);
    toast.success("Password reset email sent");
  }

  if (success) {
    return (
      <AuthCard
        title="Check your email"
        description="If an account exists with that email, we've sent password reset instructions."
      >
        <div className="mt-6">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.push("/login")}
          >
            Back to sign in
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot password?"
      description="Enter your email and we'll send you reset instructions"
    >
      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send reset instructions"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            onClick={() => router.push("/login")}
          >
            Sign in
          </Button>
        </p>
      </form>
    </AuthCard>
  );
}
