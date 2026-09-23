import type { TelegramProvider, TelegramMessage } from './types';

export class TelegramBotApiProvider implements TelegramProvider {
  name = 'telegram';

  constructor(private readonly botToken: string) {}

  async send(message: TelegramMessage): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: message.chatId,
          text: message.text,
          parse_mode: message.parseMode ?? 'HTML',
          disable_web_page_preview: true,
        }),
      });

      const result = await response.json();

      console.log('[Telegram API] Response', {
        status: response.status,
        ok: result.ok,
        description: result.description,
        errorCode: result.error_code,
      });

      if (!response.ok || !result.ok) {
        const errorMessage = result.description ?? `HTTP ${response.status}`;
        return { success: false, error: errorMessage };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown network error',
      };
    }
  }
}
