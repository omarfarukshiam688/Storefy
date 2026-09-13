"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message || "Failed to sign out");
      setIsSigningOut(false);
      return;
    }

    toast.success("Signed out successfully");
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSignOut}
      disabled={isSigningOut}
    >
      {isSigningOut ? "Signing out..." : "Sign out"}
    </Button>
  );
}
