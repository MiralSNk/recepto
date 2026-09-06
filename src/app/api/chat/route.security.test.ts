import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDB } from '@/test/mocks/db';

/**
 * Регрессионный тест на закрытую уязвимость: sanitizeLinks()/
 * isSafeHrefServer() в route.ts раньше считали ссылку "безопасной для
 * Яндекс.Карт", если строка ПРОСТО НАЧИНАЛАСЬ с "https://maps.yandex.ru"
 * (см. также src/lib/client/client-site-routes.security.test.ts —
 * идентичная проблема была продублирована и в клиентской isSafeHref()).
 *
 * Реальный парсинг URL показывает подмену хоста:
 *   "https://maps.yandex.ru@evil.com" → origin = https://evil.com
 *   ("maps.yandex.ru" здесь — userinfo, а не хост).
 *
 * Ответ YandexGPT — это LLM-контент, на который может повлиять сам
 * посетитель сайта (история диалога передаётся модели как есть, а
 * BLOCKED_PATTERNS — это лишь эвристический фильтр по формулировкам, не
 * защита от того, что модель в принципе может сгенерировать произвольный
 * markdown-текст). Именно поэтому ответ прогоняется через sanitizeLinks()
 * перед отправкой клиенту — сейчас isYandexMapsUrl() (route.ts) парсит
 * строку через new URL() и сравнивает hostname, так что фишинговая ссылка
 * "на Яндекс.Карты", реально ведущая на домен атакующего, вырезается.
 */

const mockDB = createMockDB({
  unansweredQueries: {
    findAnswer: vi.fn().mockResolvedValue(null),
    upsertUnansweredQuery: vi.fn().mockResolvedValue(undefined),
  },
  places: {
    getPlaces: vi.fn().mockResolvedValue([]),
  },
  siteSettings: {
    getSetting: vi.fn().mockImplementation(async (key: string) => {
      const map: Record<string, string> = {
        hotel_name: 'Отель Тест',
        hotel_address: 'Тестовый 1',
        hotel_phone: '+7 900 000-00-00',
        hotel_email: 'test@example.com',
      };
      return map[key] ?? '';
    }),
  },
  amenities: {
    getAllAmenities: vi.fn().mockResolvedValue([]),
  },
  categories: {
    getVisibleCategories: vi.fn().mockResolvedValue([]),
  },
  rooms: {
    getAllRooms: vi.fn().mockResolvedValue([]),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

vi.mock('@/lib/server/places-search', () => ({
  isPlacesQuery: vi.fn((t: string) => /кафе|рядом/i.test(t)),
  searchOsmNearby: vi.fn().mockResolvedValue([]),
  filterLocalPlaces: vi.fn().mockReturnValue([]),
  formatPlacesMarkdown: vi.fn(() => 'markdown'),
}));

vi.mock('@/lib/server/chat-rooms-context', () => ({
  buildBaseContext: vi.fn().mockResolvedValue('BASE'),
  buildRoomsContext: vi.fn().mockResolvedValue('ROOMS'),
}));

vi.mock('@/lib/server/seo', () => ({
  getSiteSettings: vi.fn().mockResolvedValue({
    hotel_name: 'Отель Тест',
    hotel_address: 'Тестовый 1',
    hotel_phone: '+79000000000',
    hotel_email: 'test@example.com',
  }),
  phoneToTelHref: (p: string) => (p ? `tel:${p.replace(/\D/g, '')}` : ''),
}));

function postJson(body: unknown) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/chat — sanitizeLinks ловит host-confusion ссылку (регресс-тест на исправленный баг)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.YANDEX_FOLDER_ID = 'folder';
    process.env.YANDEX_API_KEY = 'key';
  });

  it('не пропускает в ответе "Яндекс.Карты"-ссылку, реально ведущую на evil.com', async () => {
    const phishing = 'https://maps.yandex.ru@evil.com';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            alternatives: [
              {
                message: {
                  text: `Вот маршрут: [Яндекс.Карты](${phishing})`,
                },
              },
            ],
          },
        }),
      })
    );

    const { POST } = await import('./route');
    const res = await POST(
      postJson({
        messages: [{ role: 'user', content: 'Сколько стоит номер и как добраться?' }],
      })
    );
    const text = await res.text();

    // new URL() (тот же парсер, что у браузера) подтверждает: это не яндекс.
    expect(new URL(phishing).origin).toBe('https://evil.com');

    // sanitizeLinks() убирает ссылку (оставляет только подпись без href),
    // если распознаёт домен как не-Яндекс.
    expect(text).not.toContain('evil.com');
  });
});
