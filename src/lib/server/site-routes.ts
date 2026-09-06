import 'server-only';
import { getVisibleCategories } from '@/lib/server/categories-db';
import { getAllRooms } from '@/lib/server/rooms-db';

export const STATIC_PATHS = ['/', '/contacts', '/privacy'] as const;

export function categoryPath(key: string): string {
  return key === 'all' ? '/' : `/${key}`;
}

export function roomPath(category: string, id: number): string {
  const cat = category === 'all' ? 'standard' : category;
  return `/${cat}/${id}`;
}

export function isAllowedInternalPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';

  if ((STATIC_PATHS as readonly string[]).includes(path)) return true;
  if (path.startsWith('#')) return true;
  if (/^\/[a-z0-9_-]+$/i.test(path)) return true;
  if (/^\/[a-z0-9_-]+\/\d+$/i.test(path)) return true;

  return false;
}

export async function buildRoutesContext(): Promise<string> {
  const [categories, allRooms] = await Promise.all([
    getVisibleCategories(),
    getAllRooms(),
  ]);

  const categoryLines =
    categories.length === 0
      ? '(нет видимых категорий)'
      : categories.map((c) => `- ${c.label}: /${c.key}`).join('\n');

  const roomLines =
    allRooms.length === 0
      ? '(нет опубликованных номеров)'
      : allRooms
          .map(
            (r) =>
              `- ${r.name} → /${r.category}/${r.id} (от ${r.price_day} ₽/сутки)`
          )
          .join('\n');

  return `
Разделы сайта:
- Все номера: /
- Об отеле: /contacts
- Контакты: #contacts
- Политика конфиденциальности: /privacy

Категории:
${categoryLines}

Номера (точные ссылки):
${roomLines}

Ссылки только в markdown [текст](/path). Не выдумывай другие URL.
`.trim();
}