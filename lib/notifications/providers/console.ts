import type { EmailProvider, EmailMessage, NotificationResult } from '../types';

export class ConsoleEmailProvider implements EmailProvider {
  name = 'console';

  async send(message: EmailMessage): Promise<NotificationResult> {
    console.log(`[Email:${this.name}] To: ${message.to}`);
    console.log(`[Email:${this.name}] Subject: ${message.subject}`);
    console.log(`[Email:${this.name}] From: ${message.from ?? '(default)'}`);
    console.log(`[Email:${this.name}] Body (truncated): ${message.html.substring(0, 200)}...`);
    return { success: true };
  }
}
