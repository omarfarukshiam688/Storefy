import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import type { TenantMember, TenantInvitation } from '@/types';

export interface TeamMember extends TenantMember {
  profile: {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export interface PendingInvitation extends TenantInvitation {
  invited_by_profile?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

/**
 * List active members for a tenant with profile information
 */
export async function getTenantMembers(tenantId: string): Promise<TeamMember[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tenant_members')
    .select(`
      id,
      tenant_id,
      user_id,
      role,
      is_active,
      invited_by,
      last_login_at,
      created_at,
      updated_at
    `)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch team members: ${error.message}`);
  }

  const members = (data ?? []) as Array<{
    id: string;
    tenant_id: string;
    user_id: string;
    role: string;
    is_active: boolean;
    invited_by: string | null;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
  }>;

  if (members.length === 0) {
    return [];
  }

  const userIds = members.map((m) => m.user_id);

  const serviceSupabase = createServiceClient();
  const { data: profiles, error: profilesError } = await serviceSupabase
    .from('profiles')
    .select('id, name, email, avatar_url')
    .in('id', userIds);

  if (profilesError) {
    throw new Error(`Failed to fetch member profiles: ${profilesError.message}`);
  }

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  return members.map((member) => ({
    ...member,
    profile: profileMap.get(member.user_id) ?? null,
  })) as TeamMember[];
}

/**
 * List pending invitations for a tenant
 */
export async function getPendingInvitations(tenantId: string): Promise<PendingInvitation[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tenant_invitations')
    .select(`
      id,
      tenant_id,
      email,
      role,
      token,
      expires_at,
      accepted_at,
      created_at
    `)
    .eq('tenant_id', tenantId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch pending invitations: ${error.message}`);
  }

  return (data ?? []).map((item) => ({
    ...item,
    invited_by_profile: null,
  })) as PendingInvitation[];
}

/**
 * Create a new invitation
 */
export async function createInvitation(
  tenantId: string,
  email: string,
  role: 'tenant_admin' | 'tenant_staff'
): Promise<TenantInvitation> {
  const supabase = await createClient();

  // Check for existing pending invitation
  const { data: existing } = await supabase
    .from('tenant_invitations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', email.toLowerCase().trim())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (existing) {
    throw new Error('An active invitation for this email already exists');
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .or(`profiles.email.eq.${email.toLowerCase().trim()}`)
    .maybeSingle();

  if (existingMember) {
    throw new Error('This user is already a member of the tenant');
  }

  // Generate a cryptographically secure token
  const token = generateSecureToken();

  // Set expiration to 7 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from('tenant_invitations')
    .insert({
      tenant_id: tenantId,
      email: email.toLowerCase().trim(),
      role,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create invitation');
  }

  return data;
}

/**
 * Cancel (delete) a pending invitation
 */
export async function cancelInvitation(
  tenantId: string,
  invitationId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('tenant_invitations')
    .delete()
    .eq('id', invitationId)
    .eq('tenant_id', tenantId)
    .is('accepted_at', null);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Update a member's role
 */
export async function updateMemberRole(
  tenantId: string,
  memberId: string,
  newRole: 'tenant_admin' | 'tenant_staff'
): Promise<TenantMember> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tenant_members')
    .update({
      role: newRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update member role');
  }

  return data;
}

/**
 * Remove a member from the tenant (soft delete)
 */
export async function removeMember(
  tenantId: string,
  memberId: string,
  requesterId: string
): Promise<void> {
  const supabase = await createClient();

  // Prevent self-removal
  const { data: member, error: fetchError } = await supabase
    .from('tenant_members')
    .select('user_id, role')
    .eq('id', memberId)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .single();

  if (fetchError || !member) {
    throw new Error('Member not found');
  }

  if (member.user_id === requesterId) {
    throw new Error('You cannot remove yourself from the tenant');
  }

  // Check if this is the last admin
  if (member.role === 'tenant_admin') {
    const { count, error: countError } = await supabase
      .from('tenant_members')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('role', 'tenant_admin')
      .eq('is_active', true);

    if (countError) {
      throw new Error(countError.message);
    }

    if ((count ?? 0) <= 1) {
      throw new Error('Cannot remove the last tenant administrator');
    }
  }

  const { error } = await supabase
    .from('tenant_members')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .eq('tenant_id', tenantId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ tenantId: string; role: string }> {
  const supabase = await createClient();

  // Get the invitation
  const { data: invitation, error: invitationError } = await supabase
    .from('tenant_invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (invitationError || !invitation) {
    throw new Error('Invalid or expired invitation');
  }

  // Get user profile to verify email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error('Profile not found');
  }

  // Verify email matches
  if (profile.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error('This invitation was sent to a different email address');
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', invitation.tenant_id)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (existingMember) {
    throw new Error('You are already a member of this tenant');
  }

  // Create tenant membership
  const { data: member, error: memberError } = await supabase
    .from('tenant_members')
    .insert({
      tenant_id: invitation.tenant_id,
      user_id: userId,
      role: invitation.role,
      is_active: true,
    })
    .select()
    .single();

  if (memberError || !member) {
    throw new Error(memberError?.message ?? 'Failed to accept invitation');
  }

  // Mark invitation as accepted
  const { error: updateError } = await supabase
    .from('tenant_invitations')
    .update({
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invitation.id);

  if (updateError) {
    // Rollback membership creation
    await supabase
      .from('tenant_members')
      .delete()
      .eq('id', member.id);
    
    throw new Error('Failed to accept invitation');
  }

  return {
    tenantId: invitation.tenant_id,
    role: invitation.role,
  };
}

/**
 * Get invitation details by token (for the acceptance page)
 */
export async function getInvitationByToken(token: string): Promise<{
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  tenant: {
    name: string;
    slug: string;
  } | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tenant_invitations')
    .select(`
      id,
      tenant_id,
      email,
      role,
      expires_at,
      accepted_at,
      tenants (
        name,
        slug
      )
    `)
    .eq('token', token)
    .single();

  if (error || !data) {
    throw new Error('Invitation not found');
  }

  const tenants = (data.tenants as { name: string; slug: string }[] | null)?.[0] ?? null;

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    email: data.email,
    role: data.role,
    expires_at: data.expires_at,
    accepted_at: data.accepted_at,
    tenant: tenants,
  };
}

/**
 * Generate a cryptographically secure token
 */
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto.getRandomValues
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
