import type { EmailProvider, EmailMessage, NotificationResult } from '../types';

export class ResendEmailProvider implements EmailProvider {
  name = 'resend';

  constructor(private readonly apiKey: string) {}

  async send(message: EmailMessage): Promise<NotificationResult> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: message.from ?? process.env.EMAIL_FROM,
          to: message.to,
          subject: message.subject,
          html: message.html,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        const errorMessage = result.error?.message ?? `HTTP ${response.status}`;
        return { success: false, error: errorMessage };
      }

      return {
        success: true,
        messageId: result.id ?? undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown network error',
      };
    }
  }
}
