import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import type { Notification, NotificationType } from '@/types';

export async function createNotification(input: {
  tenantId: string | null;
  recipientUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  targetType?: string | null;
  targetId?: string | null;
}): Promise<Notification> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      tenant_id: input.tenantId,
      recipient_user_id: input.recipientUserId,
      type: input.type,
      title: input.title,
      message: input.message,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create notification: ${error?.message ?? 'Unknown error'}`);
  }

  return data as Notification;
}

export async function createNotificationsForTenantMembers(input: {
  tenantId: string;
  type: NotificationType;
  title: string;
  message: string;
  targetType?: string | null;
  targetId?: string | null;
  role?: 'tenant_admin' | 'tenant_staff' | 'all';
}): Promise<Notification[]> {
  const supabase = await createClient();

  let query = supabase
    .from('tenant_members')
    .select('user_id')
    .eq('tenant_id', input.tenantId)
    .eq('is_active', true);

  if (input.role && input.role !== 'all') {
    query = query.eq('role', input.role);
  }

  const { data: members, error } = await query;

  if (error || !members || members.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    members.map((member) =>
      createNotification({
        ...input,
        recipientUserId: member.user_id,
      })
    )
  );

  return results
    .filter((result): result is PromiseFulfilledResult<Notification> => result.status === 'fulfilled')
    .map((result) => result.value);
}

export async function createNotificationsForAllUsers(input: {
  type: NotificationType;
  title: string;
  message: string;
  targetType?: string | null;
  targetId?: string | null;
}): Promise<Notification[]> {
  const supabase = createServiceClient();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_active', true);

  if (error || !profiles || profiles.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    profiles.map((profile) =>
      createNotification({
        tenantId: null,
        recipientUserId: profile.id,
        type: input.type,
        title: input.title,
        message: input.message,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
      })
    )
  );

  return results
    .filter((result): result is PromiseFulfilledResult<Notification> => result.status === 'fulfilled')
    .map((result) => result.value);
}
