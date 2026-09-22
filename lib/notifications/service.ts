import { createServiceClient } from '@/lib/supabase/admin';
import type { EmailProvider, EmailMessage, NotificationEvent, NotificationResult, NotificationDeliveryStatus, NotificationEventType } from './types';
import { createEmailProvider } from './providers';
import { renderInvitationEmail, renderOrderConfirmationEmail, renderOrderStatusEmail } from './templates';

const provider: EmailProvider = createEmailProvider();
console.log('[Notifications] Provider initialized:', provider.name);

export async function sendNotification(event: NotificationEvent): Promise<void> {
  console.log('[Notifications] sendNotification called:', { type: event.type, tenantId: event.tenantId, hasRecipient: !!event.recipientEmail });
  
  if (!event.recipientEmail) {
    console.warn(`Skipping notification ${event.type}: no recipient email for tenant ${event.tenantId}`);
    return;
  }

  let message: EmailMessage | null;
  const fromAddress = process.env.EMAIL_FROM;

  switch (event.type) {
    case 'tenant.invitation_created': {
      const tenantName = event.data.tenantName as string | undefined;
      const invitedBy = event.data.invitedBy as string | undefined;
      const role = event.data.role as string | undefined;
      const invitationLink = event.data.invitationLink as string | undefined;

      if (!tenantName || !invitedBy || !role || !invitationLink) {
        console.warn(`Skipping invitation notification: missing required fields for tenant ${event.tenantId}`);
        return;
      }

      message = {
        to: event.recipientEmail,
        subject: `You've been invited to join ${tenantName}`,
        html: renderInvitationEmail({ tenantName, invitedBy, role, invitationLink }),
        from: fromAddress,
      };
      break;
    }

    case 'order.created': {
      const orderNumber = event.data.orderNumber as string | undefined;
      const customerName = event.data.customerName as string | undefined;
      const items = event.data.items as Array<{ productName: string; quantity: number; itemTotal: number }> | undefined;
      const subtotal = event.data.subtotal as number | undefined;
      const deliveryCharge = event.data.deliveryCharge as number | undefined;
      const total = event.data.total as number | undefined;
      const district = event.data.district as string | undefined;
      const deliveryAddress = event.data.deliveryAddress as string | undefined;
      const phoneNumber = event.data.phoneNumber as string | undefined;
      const storeName = event.data.storeName as string | undefined;

      if (!orderNumber || !customerName || !items || subtotal === undefined || deliveryCharge === undefined || total === undefined || !district || !deliveryAddress || !phoneNumber) {
        console.warn(`Skipping order confirmation notification: missing required fields for tenant ${event.tenantId}`);
        return;
      }

      message = {
        to: event.recipientEmail,
        subject: `Order Confirmation - ${orderNumber}`,
        html: renderOrderConfirmationEmail({
          orderNumber,
          customerName,
          items,
          subtotal,
          deliveryCharge,
          total,
          district,
          deliveryAddress,
          phoneNumber,
          storeName: storeName ?? 'Storefy Store',
        }),
        from: fromAddress,
      };
      break;
    }

    case 'order.status_changed':
    case 'payment.status_changed': {
      const orderNumber = event.data.orderNumber as string | undefined;
      const customerName = event.data.customerName as string | undefined;
      const previousStatus = event.data.previousStatus as string | undefined;
      const nextStatus = event.data.nextStatus as string | undefined;
      const storeName = event.data.storeName as string | undefined;

      if (!orderNumber || !customerName || !previousStatus || !nextStatus) {
        console.warn(`Skipping status notification: missing required fields for tenant ${event.tenantId}`);
        return;
      }

      message = {
        to: event.recipientEmail,
        subject: `Order Update - ${orderNumber}`,
        html: renderOrderStatusEmail({
          orderNumber,
          customerName,
          previousStatus,
          nextStatus,
          storeName: storeName ?? 'Storefy Store',
        }),
        from: fromAddress,
      };
      break;
    }

    default:
      console.warn(`Unknown notification event type: ${(event as { type: string }).type}`);
      return;
  }

  if (!message) {
    console.log('[Notifications] No message constructed, returning');
    return;
  }

  console.log('[Notifications] Message constructed, sending via provider:', provider.name);

  let result: NotificationResult = { success: false };
  let logStatus: NotificationDeliveryStatus = 'failed';
  let logError: string | null;

  try {
    console.log('[Notifications] Calling provider.send()...');
    result = await provider.send(message);
    console.log('[Notifications] provider.send() returned:', { success: result.success, messageId: result.messageId, error: result.error });
    logStatus = result.success ? 'sent' : 'failed';
    logError = result.error ?? null;

    if (!result.success) {
      console.error(`Notification delivery failed for ${event.type} (tenant: ${event.tenantId}):`, result.error);
    } else {
      console.log(`Notification delivered for ${event.type} (tenant: ${event.tenantId}, messageId: ${result.messageId ?? 'n/a'})`);
    }
  } catch (error) {
    logError = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Notification delivery threw for ${event.type} (tenant: ${event.tenantId}):`, logError);
  }

  await logNotification({
    tenantId: event.tenantId,
    eventType: event.type,
    recipientEmail: event.recipientEmail,
    status: logStatus,
    error: logError,
    providerMessageId: result.messageId ?? null,
    metadata: {
      provider: provider.name,
      subject: message.subject,
    },
  });
}

async function logNotification(params: {
  tenantId: string;
  eventType: NotificationEventType;
  recipientEmail: string;
  status: NotificationDeliveryStatus;
  error: string | null;
  providerMessageId: string | null;
  metadata: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from('notification_logs').insert({
      tenant_id: params.tenantId,
      event_type: params.eventType,
      recipient_email: params.recipientEmail,
      status: params.status,
      error: params.error,
      provider_message_id: params.providerMessageId,
      metadata: params.metadata,
    });

    if (error) {
      console.error('Failed to persist notification log:', error);
    }
  } catch (error) {
    console.error('Failed to persist notification log:', error);
  }
}
