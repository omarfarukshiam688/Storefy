import type { EmailProvider } from '../types';
import { ConsoleEmailProvider } from './console';
import { ResendEmailProvider } from './resend';

export function createEmailProvider(): EmailProvider {
  const configuredProvider = (process.env.EMAIL_PROVIDER ?? 'console').toLowerCase();

  if (configuredProvider === 'resend') {
    const apiKey = process.env.EMAIL_API_KEY;
    if (!apiKey) {
      const message = 'EMAIL_PROVIDER=resend requires EMAIL_API_KEY to be set';
      if (process.env.NODE_ENV === 'production') {
        throw new Error(message);
      }
      console.error(`[Notifications] ${message} — falling back to console provider`);
      return new ConsoleEmailProvider();
    }
    return new ResendEmailProvider(apiKey);
  }

  return new ConsoleEmailProvider();
}
