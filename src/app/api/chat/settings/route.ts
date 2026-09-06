/**
 * GET /api/chat/settings — публичные настройки виджета
 */
import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getDB } from '@/db';

// Тег 'chat' — тот же, что уже инвалидируют admin-роуты чат-бота при сохранении.
const getCachedChatSettings = unstable_cache(
  async () => {
    const db = getDB();
    const [capabilities, cancelBooking, quickReplies] = await Promise.all([
      db.chat.getSetting?.('capabilities_text') ??
        db.siteSettings?.getSetting?.('capabilities_text'),
      db.chat.getSetting?.('cancel_booking_text') ??
        db.siteSettings?.getSetting?.('cancel_booking_text'),
      db.chat.getQuickReplies?.() ?? Promise.resolve([]),
    ]);

    return {
      capabilities: typeof capabilities === 'string' ? capabilities : '',
      cancelBooking: typeof cancelBooking === 'string' ? cancelBooking : '',
      quickReplies: Array.isArray(quickReplies) ? quickReplies : [],
    };
  },
  ['chat-widget-settings'],
  { tags: ['chat'] }
);

export async function GET() {
  try {
    return NextResponse.json(await getCachedChatSettings());
  } catch (error) {
    console.error('GET /api/chat/settings error:', error);
    return NextResponse.json(
      { capabilities: '', cancelBooking: '', quickReplies: [] },
      { status: 200 }
    );
  }
}