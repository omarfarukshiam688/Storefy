import type { TelegramProvider, PlatformTelegramEvent, UserSignupData, TenantCreatedData, PaymentReceivedData } from './types';
import { TelegramBotApiProvider } from './provider';

let provider: TelegramProvider | null = null;

function getProvider(): TelegramProvider | null {
  if (provider) return provider;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return null;
  }

  provider = new TelegramBotApiProvider(botToken);
  return provider;
}

function escapeHtml(value: string | undefined | null): string {
  if (!value) return '—';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatUserSignup(data: UserSignupData): string {
  return `<b>🆕 NEW USER SIGNUP</b>

<b>Name:</b> ${escapeHtml(data.name)}
<b>Email:</b> ${escapeHtml(data.email)}
<b>User ID:</b> <code>${escapeHtml(data.userId)}</code>
<b>Time:</b> ${escapeHtml(data.timestamp)}`;
}

function formatTenantCreated(data: TenantCreatedData): string {
  return `<b>🏪 NEW TENANT</b>

<b>Store:</b> ${escapeHtml(data.tenantName)}
<b>Slug:</b> ${escapeHtml(data.tenantSlug)}
<b>Tenant ID:</b> <code>${escapeHtml(data.tenantId)}</code>
<b>Owner Email:</b> ${escapeHtml(data.ownerEmail)}
<b>Time:</b> ${escapeHtml(data.timestamp)}`;
}

function formatPaymentReceived(data: PaymentReceivedData): string {
  return `<b>💳 PAYMENT RECEIVED</b>

<b>Amount:</b> ${data.currency} ${data.amount.toFixed(2)}
<b>Tenant:</b> ${escapeHtml(data.tenantName ?? data.tenantId)}
<b>Tenant ID:</b> <code>${escapeHtml(data.tenantId)}</code>
<b>Payer:</b> ${escapeHtml(data.payerEmail)}
<b>Payment ID:</b> ${data.paymentId ? `<code>${escapeHtml(data.paymentId)}</code>` : '—'}
<b>Time:</b> ${escapeHtml(data.timestamp)}`;
}

export async function sendPlatformTelegram(event: PlatformTelegramEvent): Promise<void> {
  const telegramProvider = getProvider();

  console.log('[Telegram] Provider initialized:', telegramProvider ? 'yes' : 'no');

  if (!telegramProvider) {
    console.warn('[Telegram] Provider not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.');
    return;
  }

  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    console.warn('[Telegram] TELEGRAM_CHAT_ID is not set.');
    return;
  }

  const text = (() => {
    switch (event.type) {
      case 'user.signup': {
        const data = event.data as unknown as UserSignupData;
        if (!data.userId || !data.email || !data.timestamp) {
          console.warn('[Telegram] Skipping user.signup: missing required fields');
          return null;
        }
        return formatUserSignup(data);
      }

      case 'tenant.created': {
        const data = event.data as unknown as TenantCreatedData;
        if (!data.tenantId || !data.tenantName || !data.tenantSlug || !data.timestamp) {
          console.warn('[Telegram] Skipping tenant.created: missing required fields');
          return null;
        }
        return formatTenantCreated(data);
      }

      case 'payment.received': {
        const data = event.data as unknown as PaymentReceivedData;
        if (!data.amount || !data.currency || !data.tenantId || !data.timestamp) {
          console.warn('[Telegram] Skipping payment.received: missing required fields');
          return null;
        }
        return formatPaymentReceived(data);
      }

      default:
        console.warn(`[Telegram] Unknown event type: ${(event as { type: string }).type}`);
        return null;
    }
  })();

  if (!text) {
    return;
  }

  try {
    const result = await telegramProvider.send({
      chatId,
      text,
      parseMode: 'HTML',
    });

    console.log('[Telegram] Provider result', result);

    if (!result.success) {
      console.error(`[Telegram] Failed to send ${event.type}:`, result.error);
    } else {
      console.log(`[Telegram] Sent ${event.type} successfully`);
    }
  } catch (error) {
    console.error(`[Telegram] Failed to send ${event.type}:`, error);
  }
}
