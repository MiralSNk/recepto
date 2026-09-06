export const STATIC_PATHS = ['/', '/contacts', '/privacy'] as const;

/**
 * Проверяет, является ли путь допустимым внутренним маршрутом.
 * Поддерживает категории, номера, статические страницы, якоря.
 */
export function isAllowedInternalPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';

  if ((STATIC_PATHS as readonly string[]).includes(path)) return true;

  // Якорные ссылки (#contacts, #about и т.д.) — безопасны
  if (path.startsWith('#')) return true;

  // /comfort, /my-new-category
  if (/^\/[a-z0-9_-]+$/i.test(path)) return true;

  // /comfort/12
  if (/^\/[a-z0-9_-]+\/\d+$/i.test(path)) return true;

  return false;
}

// startsWith на всей строке пропускал host-confusion: "https://maps.yandex.ru
// .evil.com/x" и "https://maps.yandex.ru@evil.com" оба НАЧИНАЮТСЯ с
// доверенной подстроки, но реальный хост (то, куда браузер и window.open()
// реально ведут) — evil.com. Сравниваем распарсенный u.hostname, а не текст.
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

export function isSafeHref(href: string): boolean {
  const raw = href.trim();
  if (!raw || /^(javascript|data|vbscript):/i.test(raw)) return false;

  if (raw.startsWith('tel:') || raw.startsWith('mailto:')) return true;

  if (isYandexMapsUrl(raw)) return true;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const site =
        process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
      const allowed = new URL(site);
      const u = new URL(raw);
      if (u.origin !== allowed.origin) return false;
      return isAllowedInternalPath(u.pathname);
    } catch {
      return false;
    }
  }

  if (raw.startsWith('/') || raw.startsWith('#')) {
    const path = raw.split('?')[0] || '/';
    return isAllowedInternalPath(path);
  }

  return false;
}

export function toInternalPath(href: string): string | null {
  if (!isSafeHref(href)) return null;

  if (href.startsWith('tel:') || href.startsWith('mailto:')) return href;

  if (href.startsWith('http://') || href.startsWith('https://')) {
    try {
      const u = new URL(href);
      if (isYandexMapsUrl(href)) return href;
      return u.pathname + u.search;
    } catch {
      return null;
    }
  }

  return href.startsWith('/') || href.startsWith('#') ? href : null;
}