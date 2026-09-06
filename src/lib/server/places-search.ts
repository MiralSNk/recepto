/**
 * Поиск мест рядом с отелем.
 *
 * Порядок:
 * 1. OpenStreetMap Overpass
 * 2. Локальная таблица places
 * 3. Yandex Cloud Web Search
 *
 * Маршруты — deep-link на Яндекс.Карты (API не нужен).
 */

import 'server-only';
import { unstable_cache } from 'next/cache';

// Координаты отеля берутся из site_settings (hotel_lat/hotel_lon, редактируются
// в /admin/seo) — это дефолт на случай, если админ их ещё не заполнил.
const DEFAULT_HOTEL = {
  lat: 47.218886,
  lon: 39.71703,
} as const;

export interface FoundPlace {
  name: string;
  description?: string;
  lat: number;
  lon: number;
  category?: string;
  source: 'osm' | 'local' | 'yandex-web';
}

/** Ссылка «маршрут от отеля» */
export function routeFromHotelUrl(
  lat: number,
  lon: number,
  hotelLat: number = DEFAULT_HOTEL.lat,
  hotelLon: number = DEFAULT_HOTEL.lon
): string {
  return `https://yandex.ru/maps/?rtext=${hotelLat},${hotelLon}~${lat},${lon}&rtt=pd`;
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

//TODO: перенести в бд
const DEFAULT_RADIUS = 1200;

//TODO: перенести из бд
type OsmGroup = 'food' | 'pharmacy' | 'shop' | 'sights' | 'service';

//TODO: перенести из бд
const OSM_TAGS: Record<OsmGroup, string[]> = {
  food: [
    'node["amenity"~"^(restaurant|cafe|fast_food|bar|pub|biergarten|food_court)$"]',
    'node["shop"="bakery"]',
  ],
  pharmacy: ['node["amenity"="pharmacy"]'],
  shop: [
    'node["shop"~"^(supermarket|convenience|mall|clothes|shoes|department_store)$"]',
  ],
  sights: [
    'node["tourism"~"^(attraction|museum|viewpoint)$"]',
    'node["leisure"="park"]',
    'node["amenity"="theatre"]',
  ],
  service: [
    'node["amenity"~"^(bank|atm|post_office|laundry|hairdresser|hospital|clinic)$"]',
  ],
};

//TODO: перенести из бд
function detectGroup(query: string): OsmGroup | null {
  const t = query.toLowerCase();
  if (/поесть|завтрак|обед|ужин|ресторан|кафе|кофе|столов|бар|паб|пицц|перекусить/.test(t))
    return 'food';
  if (/аптек|лекарств/.test(t)) return 'pharmacy';
  if (/магазин|супермаркет|продукт|пятёр|магнит|одежд|обув|торговый/.test(t)) return 'shop';
  // парк(?!овк) — «парк»/«парковый», но не «парковка» (это не место, а услуга отеля)
  if (/достопримечатель|посмотреть|сходить|парк(?!овк)|театр|музей|набережн|зоопарк/.test(t))
    return 'sights';
  if (/банкомат|банк|почт|прачечн|парикмахер|больниц|химчист|услуг/.test(t)) return 'service';
  return null;
}

function dist2(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = lat1 - lat2;
  const dLon = lon1 - lon2;
  return dLat * dLat + dLon * dLon;
}

/**
 * POI через Overpass API в радиусе от отеля.
 *
 * Кэшируется по (группа места, радиус) на несколько часов — ближайшие
 * кафе/аптеки не меняются от сообщения к сообщению, а публичный Overpass API
 * не рассчитан на то, чтобы его дёргали заново на каждый чат-запрос (риск
 * рейт-лимита/бана вплоть до временной недоступности поиска мест для всех).
 */
export async function searchOsmNearby(
  query: string,
  radiusM: number = DEFAULT_RADIUS,
  hotelLat: number = DEFAULT_HOTEL.lat,
  hotelLon: number = DEFAULT_HOTEL.lon
): Promise<FoundPlace[]> {
  const group = detectGroup(query);
  return fetchOsmByGroup(group, radiusM, hotelLat, hotelLon);
}

// hotelLat/hotelLon — часть аргументов кэшируемой функции, поэтому Next
// автоматически учитывает их в ключе кэша: смена координат отеля в админке
// (например, при переносе кода на другой отель) не отдаёт места старой точки.
const fetchOsmByGroup = unstable_cache(
  async (
    group: OsmGroup | null,
    radiusM: number,
    hotelLat: number,
    hotelLon: number
  ): Promise<FoundPlace[]> => {
    const tagLines = group
      ? OSM_TAGS[group]
      : [
          ...OSM_TAGS.food,
          ...OSM_TAGS.pharmacy,
          ...OSM_TAGS.shop.slice(0, 1),
          ...OSM_TAGS.sights.slice(0, 2),
        ];

    const around = `around:${radiusM},${hotelLat},${hotelLon}`;
    const bodyParts = tagLines.map((sel) => `${sel}(${around});`).join('\n  ');
    const ql = `
[out:json][timeout:8];
(
  ${bodyParts}
);
out body 20;
`.trim();

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(ql)}`,
          signal: AbortSignal.timeout(9_000),
          cache: 'no-store',
        });
        if (!res.ok) continue;

        const data = (await res.json()) as {
          elements?: {
            lat?: number;
            lon?: number;
            tags?: Record<string, string>;
          }[];
        };

        const places: FoundPlace[] = [];
        for (const el of data.elements ?? []) {
          if (el.lat == null || el.lon == null) continue;
          const name = el.tags?.name || el.tags?.['name:ru'];
          if (!name) continue;
          const kind =
            el.tags?.amenity || el.tags?.shop || el.tags?.tourism || el.tags?.leisure || '';
          places.push({
            name,
            description: kind || undefined,
            lat: el.lat,
            lon: el.lon,
            category: group ?? kind,
            source: 'osm',
          });
        }

        places.sort(
          (a, b) =>
            dist2(hotelLat, hotelLon, a.lat, a.lon) -
            dist2(hotelLat, hotelLon, b.lat, b.lon)
        );
        return places.slice(0, 8);
      } catch (err) {
        console.warn('[places-search] Overpass failed', endpoint, err);
      }
    }
    return [];
  },
  ['osm-nearby'],
  { revalidate: 6 * 60 * 60 }
);

export interface FormatPlacesOptions {
  title?: string;
  hotelName?: string;
  hotelAddress?: string;
  hotelLat?: number;
  hotelLon?: number;
}

export function formatPlacesMarkdown(
  places: FoundPlace[],
  options: FormatPlacesOptions = {}
): string {
  if (!places.length) {
    return (
      'Рядом с отелем по этому запросу ничего не нашлось. ' +
      'Попробуйте уточнить (кафе, аптека, магазин) или откройте [контакты](/contacts).'
    );
  }

  const { title, hotelName = 'отелем', hotelAddress, hotelLat, hotelLon } = options;
  const header =
    title ?? `Рядом с ${hotelName}${hotelAddress ? ` (${hotelAddress})` : ''}:`;
  const lines = places.map((p) => {
    const link = routeFromHotelUrl(p.lat, p.lon, hotelLat, hotelLon);
    const extra = p.description ? ` — ${p.description}` : '';
    return `- [${p.name}](${link})${extra}`;
  });

  return `${header}\n${lines.join('\n')}\n\nНажмите на название, чтобы построить маршрут в Яндекс.Картах.`;
}

//TODO: перенести из бд
// Слова конкретного типа места — сами по себе достаточны для places-запроса.
const PLACE_TYPE_WORDS = [
  'где поесть', 'кафе', 'ресторан', 'аптека', 'завтрак',
  'магазин', 'одежда', 'обувь', 'достопримечательности', 'куда сходить', 'что посмотреть',
  'набережная', 'театр', 'кофейня', 'поесть', 'обед', 'ужин',
  'столовая', 'бар', 'паб', 'продукты', 'супермаркет', 'торговый центр', 'сувениры',
  'лекарство', 'банкомат', 'прачечная', 'парикмахерская', 'больница',
];
// «парк» отдельно от списка выше через regex — иначе строка .includes('парк')
// ложно сработала бы на «парковка» (услуга отеля, не место).
const PARK_WORD_RE = /парк(?!овк)/;

// Общие слова близости — сами по себе неспецифичны (например «парковка рядом» —
// это вопрос об услуге отеля, а не поиск места). Триггерят places-запрос только
// вместе со словом конкретного типа места выше, отсюда и отдельная проверка.
const PROXIMITY_WORDS = ['что рядом', 'рядом', 'поблизости', 'недалеко', 'в пешей доступности'];

export function isPlacesQuery(text: string): boolean {
  const lower = text.toLowerCase();
  if (PLACE_TYPE_WORDS.some((k) => lower.includes(k))) return true;
  if (PARK_WORD_RE.test(lower)) return true;
  return PROXIMITY_WORDS.some((k) => lower.includes(k)) && detectGroup(lower) !== null;
}

/** Фильтр локальных мест из БД по тексту запроса */
export function filterLocalPlaces(
  places: {
    name: string;
    category_key: string;
    lat: number;
    lon: number;
    description: string;
  }[],
  query: string
): FoundPlace[] {
  const lower = query.toLowerCase();
  const direct = places.filter(
    (p) =>
      lower.includes(p.name.toLowerCase()) || lower.includes(p.category_key.toLowerCase())
  );
  if (direct.length) {
    return direct.map((p) => ({
      name: p.name,
      description: p.description,
      lat: p.lat,
      lon: p.lon,
      category: p.category_key,
      source: 'local' as const,
    }));
  }

  //TODO: перенести из бд
  const map: Record<string, string[]> = {
    food: [
      'поесть', 'завтрак', 'обед', 'ужин', 'ресторан', 'кафе', 'кофейня',
      'столовая', 'бар', 'паб', 'перекусить', 'пиццерия',
    ],
    sights: [
      'достопримечательность', 'посмотреть', 'сходить', 'парк', 'театр',
      'музей', 'набережная', 'зоопарк',
    ],
    pharmacy: ['аптека', 'лекарство'],
    shop: ['магазин', 'супермаркет', 'продукты', 'пятёрочка', 'торговый', 'одежда', 'обувь'],
    service: ['банкомат', 'почта', 'прачечная', 'парикмахерская', 'больница', 'химчистка'],
  };

  for (const [key, words] of Object.entries(map)) {
    if (words.some((w) => lower.includes(w))) {
      return places
        .filter((p) => p.category_key === key)
        .map((p) => ({
          name: p.name,
          description: p.description,
          lat: p.lat,
          lon: p.lon,
          category: p.category_key,
          source: 'local' as const,
        }));
    }
  }
  return [];
}