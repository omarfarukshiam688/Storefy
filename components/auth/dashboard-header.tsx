"use client";

import * as React from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";

interface DashboardHeaderProps {
  profileName?: string | null;
}

export function DashboardHeader({ profileName }: DashboardHeaderProps) {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">Storefy</span>
          <span className="text-sm text-muted-foreground">/ Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {profileName ?? "User"}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
