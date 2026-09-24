'use server';

import { sendPlatformTelegram } from '@/lib/notifications/telegram';

export async function notifyUserSignup(userId: string, email: string, name: string | undefined) {
  await sendPlatformTelegram({
    type: 'user.signup',
    data: {
      userId,
      email,
      name,
      timestamp: new Date().toISOString(),
    },
  });
}
