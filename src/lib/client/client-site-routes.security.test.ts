import { describe, it, expect } from 'vitest';
import { isSafeHref, toInternalPath } from '@/lib/client/client-site-routes';

/**
 * Регрессионные тесты на закрытую уязвимость: isSafeHref()/toInternalPath()
 * раньше считали ссылку "безопасной", если строка ПРОСТО НАЧИНАЛАСЬ с
 * "https://maps.yandex.ru" (String.prototype.startsWith без проверки границы
 * хоста) — реальный парсинг URL показывает, что хост можно подделать:
 *
 *   "https://maps.yandex.ru@evil.com"     → origin = https://evil.com
 *                                            ("maps.yandex.ru" — это userinfo,
 *                                            а не хост)
 *   "https://maps.yandex.ru.evil.com/x"   → host = maps.yandex.ru.evil.com
 *                                            (поддомен evil.com, не яндекса)
 *
 * Сейчас isYandexMapsUrl() парсит строку через new URL() и сравнивает
 * u.hostname (см. client-site-routes.ts) — тесты ниже фиксируют, что
 * host-confusion больше не проходит. Это единственная проверка на клиенте
 * перед window.open()/router.push() в ChatWidget.handleNavigation(), т.е. до
 * фикса ссылка, вставленная ИИ-ассистентом (или canned-ответом админа) как
 * "Яндекс.Карты", реально уводила пользователя на произвольный домен
 * атакующего — фишинг под видом ссылки, которую чат-бот считает доверенной.
 */
describe('isSafeHref — host-confusion через userinfo/суффикс (регресс-тест на исправленный баг)', () => {
  it('не считает безопасной ссылку с userinfo-подменой хоста (@evil.com)', () => {
    const evil = 'https://maps.yandex.ru@evil.com';
    // Реальный браузер (и new URL()) видит здесь origin = https://evil.com
    expect(new URL(evil).origin).toBe('https://evil.com');
    expect(isSafeHref(evil)).toBe(false);
  });

  it('не считает безопасной ссылку с доменом-суффиксом (maps.yandex.ru.evil.com)', () => {
    const evil = 'https://maps.yandex.ru.evil.com/route';
    expect(new URL(evil).host).toBe('maps.yandex.ru.evil.com');
    expect(isSafeHref(evil)).toBe(false);
  });

  it('toInternalPath не возвращает чужой домен как "внутренний" путь', () => {
    const evil = 'https://maps.yandex.ru@evil.com';
    expect(toInternalPath(evil)).toBeNull();
  });
});
