export type PlatformTelegramEventType =
  | 'user.signup'
  | 'tenant.created'
  | 'payment.received';

export interface PlatformTelegramEvent {
  type: PlatformTelegramEventType;
  data: Record<string, unknown>;
}

export interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown';
}

export interface TelegramProvider {
  name: string;
  send(message: TelegramMessage): Promise<{ success: boolean; error?: string }>;
}

export interface UserSignupData {
  userId: string;
  email: string;
  name?: string;
  timestamp: string;
}

export interface TenantCreatedData {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  ownerEmail?: string;
  timestamp: string;
}

export interface PaymentReceivedData {
  amount: number;
  currency: string;
  payerEmail?: string;
  tenantId: string;
  tenantName?: string;
  paymentId?: string;
  timestamp: string;
}
