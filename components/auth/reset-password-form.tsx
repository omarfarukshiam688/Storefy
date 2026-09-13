"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ResetPasswordForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<ResetPasswordInput>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const rawData = {
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    };

    const validated = resetPasswordSchema.safeParse(rawData);
    if (!validated.success) {
      const fieldErrors: Partial<ResetPasswordInput> = {};
      for (const issue of validated.error.issues) {
        const field = issue.path[0] as keyof ResetPasswordInput;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      setIsSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: validated.data.password,
    });

    if (error) {
      toast.error(error.message || "Failed to reset password");
      setIsSubmitting(false);
      return;
    }

    toast.success("Password reset successfully");
    router.push("/login");
    router.refresh();
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter a new password for your account"
    >
      <form onSubmit={onSubmit} className="space-y-4 p-6 pt-0">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={isSubmitting}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={isSubmitting}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Resetting..." : "Reset password"}
        </Button>
      </form>
    </AuthCard>
  );
}
