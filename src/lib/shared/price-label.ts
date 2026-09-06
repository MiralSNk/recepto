/**
 * Кастомная надпись цены в админке — шаблон с плейсхолдером {price},
 * а не полная замена текста. Так число всегда актуальное (из «Цена»),
 * а редактируется только обрамляющий текст («от», «₽/ночь» и т.п.).
 * Без {price} в шаблоне (или без самого шаблона) — берём дефолт целиком,
 * чтобы старое число, вписанное вручную, никогда не «прилипало» намертво.
 */
export function formatPriceLabel(
  price: number,
  template: string | null | undefined,
  fallback: string
): string {
  const formattedPrice = `${price.toLocaleString('ru-RU')} ₽`;
  if (template && template.includes('{price}')) {
    return template.replace('{price}', formattedPrice);
  }
  return fallback;
}
