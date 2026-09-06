import { describe, it, expect } from 'vitest';
import { formatMessage, extractBookingPrefill } from '@/lib/shared/chat-utils';

describe('formatMessage', () => {
  it('превращает markdown-ссылку в <a>', () => {
    const html = formatMessage('Смотри [Комфорт](/comfort)');
    expect(html).toContain('href="/comfort"');
    expect(html).toContain('Комфорт');
  });

  it('экранирует списки', () => {
    const html = formatMessage('- один\n- два');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>один</li>');
  });
});

describe('extractBookingPrefill', () => {
  it('возвращает null без блока', () => {
    const r = extractBookingPrefill('Просто текст');
    expect(r.prefill).toBeNull();
    expect(r.visible).toBe('Просто текст');
  });

  it('парсит BOOKING-блок', () => {
    const text =
      'Бронь\n<!--BOOKING {"roomId":5,"roomName":"Люкс","adults":2} BOOKING-->';
    const r = extractBookingPrefill(text);
    expect(r.visible).toBe('Бронь');
    expect(r.prefill?.roomId).toBe(5);
    expect(r.prefill?.roomName).toBe('Люкс');
    expect(r.prefill?.adults).toBe('2');
  });
});