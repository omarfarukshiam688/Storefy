"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function VerifyEmailForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  async function resendVerification() {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message || "Failed to resend verification email");
      setIsSubmitting(false);
      return;
    }

    setSuccess(true);
    toast.success("Verification email sent");
    setIsSubmitting(false);
  }

  return (
    <AuthCard
      title="Verify your email"
      description="Please check your inbox and click the verification link to activate your account."
    >
      <div className="space-y-4 p-6 pt-0">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting || success}
          />
        </div>
        <Button
          type="button"
          className="w-full"
          onClick={resendVerification}
          disabled={isSubmitting || success}
        >
          {success ? "Email sent" : isSubmitting ? "Sending..." : "Resend verification email"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already verified?{" "}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            onClick={() => router.push("/login")}
          >
            Sign in
          </Button>
        </p>
      </div>
    </AuthCard>
  );
}
