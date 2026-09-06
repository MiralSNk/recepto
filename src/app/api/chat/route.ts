/**
 * POST /api/chat
 *
 * Порядок:
 * 0. Готовый ответ из админки (findAnswer)
 * 1. Вопросы об отеле → YandexGPT
 * 2. Места: OSM Overpass → local DB → Yandex Web Search
 * 3. Остальное → YandexGPT
 * Слабые ответы → chat_unanswered_queries
 */

import 'server-only';
import { getDB } from '@/db';
import { isAllowedInternalPath } from '@/lib/server/site-routes';
import { buildBaseContext } from '@/lib/server/chat-rooms-context';
import { getSiteSettings, phoneToTelHref } from '@/lib/server/seo';
import { getPlaces } from '@/lib/server/places-db';
import { createRateLimiter } from '@/lib/server/rate-limit';
import {
  isPlacesQuery,
  searchOsmNearby,
  filterLocalPlaces,
  formatPlacesMarkdown,
} from '@/lib/server/places-search';

// ---------- Безопасность ----------
// IP берётся из x-forwarded-for/x-real-ip — эти заголовки можно подделать,
// если reverse proxy их не перезаписывает. См. src/lib/server/rate-limit.ts
// про ограничения in-memory лимитера при масштабировании.
const checkRateLimit = createRateLimiter(8, 60_000);
const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_CONTENT = 1200;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Эвристический фильтр prompt injection по известным формулировкам.
// Это не надёжная защита — перефразированный или иноязычный запрос может
// пройти мимо; вторая линия обороны — sanitizeResponse ниже, которая режет
// ответ, если модель всё же процитировала BASE_CONTEXT.
const BLOCKED_PATTERNS = [
  /system prompt/i,
  /base context/i,
  /инструкции/i,
  /ignore previous/i,
  /игнорируй предыдущие/i,
  /раскрой свои правила/i,
  /какой твой промпт/i,
];

function sanitizeMessage(text: string): string | null {
  const cleaned = text.slice(0, MAX_MESSAGE_LENGTH).trim();
  if (!cleaned) return null;
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(cleaned)) return null;
  }
  return cleaned;
}

function sanitizeResponse(text: string): string {
  if (/BASE_CONTEXT/i.test(text) && text.length > 400) {
    return 'Извините, я не могу предоставить эту информацию.';
  }
  return text;
}

function isFlexibleSitePath(pathWithQuery: string): boolean {
  const path = (pathWithQuery.split('?')[0] || '/').replace(/\/+$/, '') || '/';
  if (path === '/' || path === '/contacts' || path === '/privacy') return true;
  if (/^\/[a-z0-9_-]+$/i.test(path)) return true;
  if (/^\/[a-z0-9_-]+\/\d+$/i.test(path)) return true;
  return false;
}

// startsWith на всей строке пропускал host-confusion: "https://maps.yandex.ru
// .evil.com/x" и "https://maps.yandex.ru@evil.com" оба НАЧИНАЮТСЯ с
// доверенной подстроки, но реальный хост — evil.com. Сравниваем
// распарсенный u.hostname, а не текст (см. тот же фикс в client-site-routes.ts).
function isYandexMapsUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    return (
      u.hostname === 'maps.yandex.ru' ||
      (u.hostname === 'yandex.ru' && u.pathname.startsWith('/maps'))
    );
  } catch {
    return false;
  }
}

function isSafeHrefServer(href: string): boolean {
  const raw = href.trim();
  if (!raw || /^(javascript|data|vbscript):/i.test(raw)) return false;
  if (raw.startsWith('tel:') || raw.startsWith('mailto:')) return true;
  // Якоря вида #contacts — buildRoutesContext() прямо учит модель их использовать
  // (isAllowedInternalPath тоже их разрешает), синхронизируем с этим правилом.
  if (raw.startsWith('#')) return isAllowedInternalPath(raw);
  if (isYandexMapsUrl(raw)) return true;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const site =
        process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
      const u = new URL(raw);
      if (u.origin !== new URL(site).origin) return false;
      return isAllowedInternalPath(u.pathname) || isFlexibleSitePath(u.pathname);
    } catch {
      return false;
    }
  }
  if (raw.startsWith('/')) {
    const path = raw.split('?')[0] || '/';
    return isAllowedInternalPath(path) || isFlexibleSitePath(path);
  }
  return false;
}

function sanitizeLinks(text: string): string {
  const placeholders: string[] = [];
  let out = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
    const u = String(url).trim();
    if (isSafeHrefServer(u)) {
      const idx = placeholders.length;
      placeholders.push(match);
      return `\u0000${idx}\u0000`;
    }
    return String(label);
  });

  out = out.replace(/https?:\/\/[^\s)<>\]]+/gi, (url) =>
    isSafeHrefServer(url) ? url : ''
  );
  out = out.replace(/\u0000(\d+)\u0000/g, (_m, idx) => placeholders[Number(idx)]);
  return out.replace(/[ \t]{2,}/g, ' ').trim();
}

// ---------- Классификация отеля (не бренд — общие слова) ----------
const HOTEL_KEYWORDS = [
  'номер',
  'бронь',
  'бронирование',
  'забронировать',
  'цена',
  'стоимость',
  'адрес',
  'телефон',
  'почта',
  'контакты',
  'как добраться',
  'проезд',
  'услуги',
  'правила',
  'заезд',
  'выезд',
  'ресторан отеля',
  'отмен',
  'категори',
  'стандарт',
  'комфорт',
  'бизнес',
  'люкс',
  'сингл',
  'апартамент',
  'парковк',
  'wifi',
  'wi-fi',
  'вайфай',
  'трансфер',
  'скидк',
  'депозит',
];

function isHotelQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return HOTEL_KEYWORDS.some((k) => lower.includes(k));
}

function normalizeHistory(messages: ChatMessage[]): ChatMessage[] {
  const cleaned: ChatMessage[] = [];
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const content = String(m.content || '').slice(0, MAX_HISTORY_CONTENT).trim();
    if (!content) continue;
    cleaned.push({ role: m.role, content });
  }
  const sliced = cleaned.slice(-MAX_HISTORY_MESSAGES);
  while (sliced.length && sliced[0].role === 'assistant') sliced.shift();
  return sliced;
}

async function callYandexGPT(
  history: ChatMessage[]
): Promise<{ ok: true; text: string } | { ok: false; status: number }> {
  const folderId = process.env.YANDEX_FOLDER_ID;
  const apiKey = process.env.YANDEX_API_KEY;
  if (!folderId || !apiKey) return { ok: false, status: 502 };

  // Один getSiteSettings() на весь вызов вместо трёх (route + buildBaseContext +
  // buildRoomsContext) — раньше это давало ~90 лишних SQL-запросов на сообщение.
  const settings = await getSiteSettings();
  const baseContext = await buildBaseContext(settings);
  const hotelName = settings.hotel_name || 'отеля';

  const yandexMessages: { role: string; text: string }[] = [
    { role: 'user', text: baseContext },
    {
      role: 'assistant',
      text: `Понял. Я консьерж ${hotelName}. Буду отвечать по правилам и давать только разрешённые ссылки.`,
    },
  ];

  for (const m of history) {
    yandexMessages.push({
      role: m.role === 'user' ? 'user' : 'assistant',
      text: m.content,
    });
  }

  const response = await fetch(
    'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Api-Key ${apiKey}`,
        'x-folder-id': folderId,
      },
      body: JSON.stringify({
        modelUri: `gpt://${folderId}/yandexgpt-lite`,
        completionOptions: {
          stream: false,
          // Ниже температура — меньше риск, что модель выдумает несуществующую
          // ссылку/номер (правила в system-промпте это запрещают, но модель
          // иногда всё равно фантазирует при высокой temperature).
          temperature: 0.3,
          maxTokens: 1500,
        },
        messages: yandexMessages,
      }),
    }
  );

  if (!response.ok) {
    console.error('YandexGPT error:', response.status);
    return { ok: false, status: 502 };
  }

  const data = await response.json();
  let answer =
    data.result?.alternatives?.[0]?.message?.text ||
    'Извините, не могу ответить сейчас.';
  answer = sanitizeResponse(answer);
  answer = sanitizeLinks(answer);
  return { ok: true, text: answer };
}

/** Fallback: заголовки из Yandex Cloud Web Search */
async function searchPlacesWeb(query: string): Promise<string[]> {
  const folderId = process.env.YANDEX_FOLDER_ID;
  const apiKey = process.env.YANDEX_API_KEY;
  if (!folderId || !apiKey) return [];

  const settings = await getSiteSettings();
  const near = settings.hotel_address || '';
  const searchQuery = near ? `${query} рядом с ${near}` : query;

  const body = JSON.stringify({
    query: { searchType: 'SEARCH_TYPE_RU', queryText: searchQuery },
    folderId,
    responseFormat: 'FORMAT_XML',
    lr: '39',
  });

  try {
    const res = await fetch('https://searchapi.api.cloud.yandex.net/v2/web/search', {
      method: 'POST',
      headers: {
        Authorization: `Api-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rawData = data.rawData;
    if (!rawData) return [];
    const xml = Buffer.from(rawData, 'base64').toString('utf-8');
    const titles: string[] = [];
    const groupRegex = /<group>([\s\S]*?)<\/group>/g;
    let match;
    while ((match = groupRegex.exec(xml)) !== null) {
      const titleMatch = match[1].match(/<title>(.*?)<\/title>/);
      if (titleMatch?.[1]?.trim()) {
        const clean = titleMatch[1].replace(/<[^>]+>/g, '').trim();
        if (clean && !titles.includes(clean)) titles.push(clean);
      }
    }

    const brand = (settings.hotel_name || '').replace(/[«»"]/g, '').trim();
    return titles
      .filter((t) => {
        if (brand && t.includes(brand)) return false;
        return true;
      })
      .slice(0, 5);
  } catch {
    return [];
  }
}

function isWeakAnswer(text: string): boolean {
  return /(не знаю|нет информации|не могу ответить|не могу найти|не удалось|затрудняюсь ответить|уточните|нет точной информации|не располагаю)/i.test(
    text
  );
}

function plainResponse(text: string, status = 200) {
  return new Response(text, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

// ---------- POST ----------
export async function POST(req: Request) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  if (!checkRateLimit(ip)) {
    return plainResponse('Слишком много запросов. Попробуйте позже.', 429);
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return plainResponse('Некорректный запрос.', 400);
  }

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const history = normalizeHistory(
    rawMessages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: String(m.content ?? ''),
    }))
  );

  if (history.length === 0) return plainResponse('Пустое сообщение.', 400);

  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  if (!lastUser) return plainResponse('Нет сообщения пользователя.', 400);

  const lastUserMessage = sanitizeMessage(lastUser.content);
  if (lastUserMessage === null) {
    return plainResponse('Извините, я не могу обработать этот запрос.');
  }

  const safeHistory = history.map((m, i) =>
    i === history.length - 1 && m.role === 'user'
      ? { ...m, content: lastUserMessage }
      : m
  );

  const db = getDB();

  // 0. Готовый ответ администратора
  try {
    const repo = db.unansweredQueries as {
      findAnswer?: (q: string) => Promise<string | null>;
    };
    if (typeof repo.findAnswer === 'function') {
      const canned = await repo.findAnswer(lastUserMessage);
      if (canned) return plainResponse(sanitizeLinks(canned));
    }
  } catch (e) {
    console.warn('findAnswer skipped', e);
  }

  // 1. Отель → GPT
  if (isHotelQuery(lastUserMessage)) {
    const result = await callYandexGPT(safeHistory);
    if (!result.ok) {
      return plainResponse('Ошибка сервиса: попробуйте позже.', result.status);
    }
    if (isWeakAnswer(result.text)) {
      await db.unansweredQueries.upsertUnansweredQuery(lastUserMessage);
    }
    return plainResponse(result.text);
  }

  // 2. Места: OSM → local DB → web search
  if (isPlacesQuery(lastUserMessage)) {
    const placesSettings = await getSiteSettings();
    const hotelLat = Number(placesSettings.hotel_lat) || undefined;
    const hotelLon = Number(placesSettings.hotel_lon) || undefined;
    let found = await searchOsmNearby(lastUserMessage, undefined, hotelLat, hotelLon);

    if (found.length === 0) {
      const placesRows = await getPlaces();
      found = filterLocalPlaces(placesRows, lastUserMessage);
    }

    if (found.length > 0) {
      return plainResponse(
        sanitizeLinks(
          formatPlacesMarkdown(found, {
            hotelName: placesSettings.hotel_name || undefined,
            hotelAddress: placesSettings.hotel_address || undefined,
            hotelLat,
            hotelLon,
          })
        )
      );
    }

    try {
      const online = await searchPlacesWeb(lastUserMessage);
      if (online.length > 0) {
        const list = online.map((p, i) => `${i + 1}. ${p}`).join('\n');
        const settings = await getSiteSettings();
        const mapQ = encodeURIComponent(
          `${lastUserMessage} ${settings.hotel_address || ''}`.trim()
        );
        return plainResponse(
          `Найдены упоминания рядом с отелем:\n${list}\n\nУточнить маршрут можно в [Яндекс.Картах](https://yandex.ru/maps/?text=${mapQ}).`
        );
      }
    } catch (err) {
      console.error('Search API error:', err);
    }

    await db.unansweredQueries.upsertUnansweredQuery(lastUserMessage);

    const settings = await getSiteSettings();
    const telHref = phoneToTelHref(settings.hotel_phone);
    const callPart = telHref
      ? ` или [позвонить](${telHref})`
      : '';

    return plainResponse(
      `Рядом с отелем по вашему запросу ничего не найдено. Могу подсказать контакты: [Об отеле](/contacts)${callPart}.`
    );
  }

  // 3. Остальное → GPT
  const result = await callYandexGPT(safeHistory);
  if (!result.ok) {
    return plainResponse('Ошибка сервиса: попробуйте позже.', result.status);
  }
  if (isWeakAnswer(result.text)) {
    await db.unansweredQueries.upsertUnansweredQuery(lastUserMessage);
  }
  return plainResponse(result.text);
}