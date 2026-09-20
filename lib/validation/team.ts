import { z } from 'zod';

export const createInvitationSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  role: z.enum(['tenant_admin', 'tenant_staff'], {
    required_error: 'Role is required',
  }),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['tenant_admin', 'tenant_staff'], {
    required_error: 'Role is required',
  }),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
