import { NextRequest, NextResponse } from 'next/server';
import { sendPlatformTelegram } from '@/lib/notifications/telegram';
import type { PlatformTelegramEventType } from '@/lib/notifications/telegram';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body as { type: PlatformTelegramEventType; data: Record<string, unknown> };

    if (!type || !data) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    console.log('[Telegram API] Received request', {
      type,
      botToken: process.env.TELEGRAM_BOT_TOKEN ? 'set' : 'missing',
      chatId: process.env.TELEGRAM_CHAT_ID ? 'set' : 'missing',
    });

    const result = await sendPlatformTelegram({ type, data });

    console.log('[Telegram API] Service result', result);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Platform telegram notification error:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
