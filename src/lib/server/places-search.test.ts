import { describe, it, expect } from 'vitest';
import {
  isPlacesQuery,
  filterLocalPlaces,
  formatPlacesMarkdown,
  routeFromHotelUrl,
} from '@/lib/server/places-search';

describe('isPlacesQuery', () => {
  it('распознаёт кафе', () => {
    expect(isPlacesQuery('Где кафе рядом?')).toBe(true);
  });
  it('не срабатывает на цену номера', () => {
    expect(isPlacesQuery('Сколько стоит номер?')).toBe(false);
  });
  it('не срабатывает на общее "рядом" без типа места (вопрос об услуге отеля)', () => {
    expect(isPlacesQuery('Есть парковка рядом?')).toBe(false);
  });
  it('срабатывает на "рядом" вместе с типом места', () => {
    expect(isPlacesQuery('Подскажите, рядом есть аптеки?')).toBe(true);
  });
});

describe('filterLocalPlaces', () => {
  const places = [
    {
      name: 'Кофейня А',
      category_key: 'food',
      lat: 47.2,
      lon: 39.7,
      description: 'кофе',
    },
    {
      name: 'Аптека',
      category_key: 'pharmacy',
      lat: 47.21,
      lon: 39.71,
      description: '',
    },
  ];

  it('фильтрует по категории food', () => {
    const r = filterLocalPlaces(places, 'где поесть');
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('Кофейня А');
    expect(r[0].source).toBe('local');
  });

  it('фильтрует по имени', () => {
    const r = filterLocalPlaces(places, 'аптека');
    expect(r.some((p) => p.name === 'Аптека')).toBe(true);
  });
});

describe('routeFromHotelUrl', () => {
  it('строит deep-link Яндекс.Карт', () => {
    const url = routeFromHotelUrl(47.22, 39.72);
    expect(url).toContain('yandex.ru/maps');
    expect(url).toContain('rtext=');
  });
});

describe('formatPlacesMarkdown', () => {
  it('пустой список — подсказка', () => {
    const t = formatPlacesMarkdown([]);
    expect(t.toLowerCase()).toMatch(/не|ничего/);
  });

  it('список с ссылками', () => {
    const t = formatPlacesMarkdown([
      {
        name: 'Кафе',
        lat: 47.2,
        lon: 39.7,
        source: 'local',
      },
    ]);
    expect(t).toContain('[Кафе]');
    expect(t).toContain('yandex.ru/maps');
  });
});