export type NotificationEventType =
  | 'tenant.invitation_created'
  | 'order.created'
  | 'order.status_changed'
  | 'payment.status_changed';

export type NotificationDeliveryStatus = 'pending' | 'sent' | 'failed';

export interface NotificationEvent {
  type: NotificationEventType;
  tenantId: string;
  recipientEmail: string | null;
  data: Record<string, unknown>;
}

export interface NotificationResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<NotificationResult>;
}

export interface NotificationLog {
  id: string;
  tenantId: string;
  eventType: NotificationEventType;
  recipientEmail: string;
  status: NotificationDeliveryStatus;
  error: string | null;
  providerMessageId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}
