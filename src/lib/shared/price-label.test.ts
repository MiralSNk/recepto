import { describe, it, expect } from 'vitest';
import { formatPriceLabel } from './price-label';

describe('formatPriceLabel', () => {
  it('без шаблона — дефолт с живой ценой', () => {
    expect(formatPriceLabel(2900, null, 'от 2 900 ₽ / ночь')).toBe('от 2 900 ₽ / ночь');
  });

  it('шаблон без {price} — игнорируется, дефолт (число не должно "прилипать")', () => {
    expect(formatPriceLabel(3500, 'от 2900 ₽/ночь', 'от 3 500 ₽ / ночь')).toBe(
      'от 3 500 ₽ / ночь'
    );
  });

  it('шаблон с {price} — подставляет актуальную цену', () => {
    // toLocaleString('ru-RU') разделяет тысячи неразрывным пробелом (U+00A0),
    // а не обычным — строим ожидаемое значение тем же вызовом, а не литералом.
    expect(formatPriceLabel(3500, 'от {price} / ночь', 'fallback')).toBe(
      `от ${(3500).toLocaleString('ru-RU')} ₽ / ночь`
    );
  });

  it('цена в шаблоне обновляется при смене базовой цены', () => {
    const template = 'Цена: {price}';
    expect(formatPriceLabel(1000, template, '')).toBe(`Цена: ${(1000).toLocaleString('ru-RU')} ₽`);
    expect(formatPriceLabel(2000, template, '')).toBe(`Цена: ${(2000).toLocaleString('ru-RU')} ₽`);
  });
});
