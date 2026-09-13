export const roles = {
  super_admin: "super_admin",
  tenant_admin: "tenant_admin",
  tenant_staff: "tenant_staff",
} as const;

export type Role = (typeof roles)[keyof typeof roles];

export const roleHierarchy: Record<Role, number> = {
  [roles.super_admin]: 100,
  [roles.tenant_admin]: 50,
  [roles.tenant_staff]: 10,
};

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
