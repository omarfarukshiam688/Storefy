import { createClient } from "@/lib/supabase/server";
import { AuthError, ForbiddenError } from "./errors";
import type { Profile, Tenant, TenantMember } from "@/types";

export interface TenantContext {
  profile: Profile;
  activeTenant: Tenant | null;
  membership: TenantMember | null;
  role: "tenant_admin" | "tenant_staff" | null;
}

export async function getTenantContext(): Promise<TenantContext> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError("Unauthorized");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new AuthError("Profile not found");
  }

  if (!profile.default_tenant_id) {
    return {
      profile,
      activeTenant: null,
      membership: null,
      role: null,
    };
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

  return {
    profile,
    activeTenant: tenant,
    membership,
    role: (membership?.role as "tenant_admin" | "tenant_staff") ?? null,
  };
}

export async function requireTenantMembership(tenantId: string): Promise<TenantMember> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError("Unauthorized");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("tenant_members")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new ForbiddenError("Not a member of this tenant");
  }

  return membership;
}

export async function requireTenantAdmin(tenantId: string): Promise<TenantMember> {
  const membership = await requireTenantMembership(tenantId);

  if (membership.role !== "tenant_admin") {
    throw new ForbiddenError("Tenant admin access required");
  }

  return membership;
}

export async function requireSuperAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthError("Unauthorized");
  }

  const { data: isSuperAdmin, error: superAdminError } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (superAdminError || !isSuperAdmin) {
    throw new ForbiddenError("Super admin access required");
  }

  return user;
}
