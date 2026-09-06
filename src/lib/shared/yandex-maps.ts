/**
 * Извлекает координаты из ссылки Яндекс.Карт — общий util, чтобы «вставил
 * ссылку → координаты сами посчитались» работало одинаково везде, где нужны
 * lat/lon (места рядом для ИИ-чата, координаты отеля в SEO), а не было
 * скопировано в каждый компонент по отдельности.
 *
 * Понимает два формата параметров запроса (ссылка должна быть полным URL,
 * без разворачивания коротких ссылок yandex.ru/maps/-/... — короткие ссылки
 * не содержат координат в самом URL):
 * - ?ll=lon,lat — обычная ссылка на точку (у Яндекса долгота идёт первой);
 * - ?rtext=lat,lon~lat,lon — ссылка на маршрут, берём вторую точку
 *   (пункт назначения), формат внутри — наоборот, широта первой.
 */
export function extractCoordsFromYandexMapsLink(link: string): { lat: number; lon: number } | null {
  try {
    const url = new URL(link);

    const ll = url.searchParams.get('ll');
    if (ll) {
      const [lon, lat] = ll.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
    }

    const rtext = url.searchParams.get('rtext');
    if (rtext) {
      const parts = rtext.split('~');
      if (parts.length >= 2) {
        const [lat, lon] = parts[1].split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
      }
    }
  } catch {
    // не абсолютный URL — не наша забота, вызывающий код покажет ошибку
  }
  return null;
}
