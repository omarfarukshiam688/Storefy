"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { signInSchema, type SignInInput } from "@/lib/validation/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

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
      email: formData.get("email") as string,
      password: formData.get("password") as string,
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
    const { error } = await supabase.auth.signInWithPassword({
      email: validated.data.email,
      password: validated.data.password,
    });

    if (error) {
      toast.error(error.message || "Failed to sign in");
      setIsSubmitting(false);
      return;
    }

    toast.success("Signed in successfully");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthCard
      title="Sign in to Storefy"
      description="Enter your credentials to access your account"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            disabled={isSubmitting || isLoading}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isSubmitting || isLoading}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password}</p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-xs"
            onClick={() => router.push("/forgot-password")}
          >
            Forgot password?
          </Button>
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting || isLoading}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            onClick={() => router.push("/signup")}
          >
            Sign up
          </Button>
        </p>
      </form>
    </AuthCard>
  );
}
