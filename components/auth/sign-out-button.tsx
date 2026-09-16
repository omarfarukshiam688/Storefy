"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SignOutButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  showLabel?: boolean;
}

export function SignOutButton({ showLabel = true, className, ...props }: SignOutButtonProps) {
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

  if (!showLabel) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className={cn("text-muted-foreground hover:text-foreground", className)}
        {...props}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={className}
      {...props}
    >
      {isSigningOut ? "Signing out..." : "Sign out"}
    </Button>
  );
}
