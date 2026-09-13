"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Tenant, TenantMember } from "@/types";

interface TenantContextState {
  profile: Profile | null;
  activeTenant: Tenant | null;
  membership: TenantMember | null;
  role: "tenant_admin" | "tenant_staff" | null;
  isLoading: boolean;
  error: Error | null;
}

export function useTenant(): TenantContextState {
  const [state, setState] = useState<TenantContextState>({
    profile: null,
    activeTenant: null,
    membership: null,
    role: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const supabase = createClient();

    async function loadTenantContext() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!profile) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        if (!profile.default_tenant_id) {
          setState({
            profile,
            activeTenant: null,
            membership: null,
            role: null,
            isLoading: false,
            error: null,
          });
          return;
        }

        const { data: membership } = await supabase
          .from("tenant_members")
          .select("*")
          .eq("tenant_id", profile.default_tenant_id)
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        const { data: tenant } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", profile.default_tenant_id)
          .maybeSingle();

        setState({
          profile,
          activeTenant: tenant,
          membership: membership,
          role: (membership?.role as "tenant_admin" | "tenant_staff") ?? null,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error("Failed to load tenant context"),
        }));
      }
    }

    loadTenantContext();
  }, []);

  return state;
}
