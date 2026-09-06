import { describe, it, expect } from 'vitest';
import { extractCoordsFromYandexMapsLink } from './yandex-maps';

describe('extractCoordsFromYandexMapsLink', () => {
  it('извлекает координаты из ?ll= (долгота первой, как у Яндекса)', () => {
    expect(extractCoordsFromYandexMapsLink('https://yandex.ru/maps/?ll=39.7184,47.2182&z=16')).toEqual({
      lat: 47.2182,
      lon: 39.7184,
    });
  });

  it('извлекает координаты из ?rtext= (вторая точка маршрута, широта первой)', () => {
    expect(
      extractCoordsFromYandexMapsLink('https://yandex.ru/maps/?rtext=47.1,39.1~47.2182,39.7184')
    ).toEqual({ lat: 47.2182, lon: 39.7184 });
  });

  it('null для не-URL строки', () => {
    expect(extractCoordsFromYandexMapsLink('не ссылка')).toBeNull();
  });

  it('null, если нет ни ll, ни rtext', () => {
    expect(extractCoordsFromYandexMapsLink('https://yandex.ru/maps/39/rostov-na-donu/')).toBeNull();
  });

  it('null для пустой строки', () => {
    expect(extractCoordsFromYandexMapsLink('')).toBeNull();
  });
});
