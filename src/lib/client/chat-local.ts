export type PublicCategory = { key: string; label: string };

/**
 * Формирует текст со списком категорий для быстрого ответа.
 * Категории передаются из БД (получены через API).
 */
export function roomsOverviewText(categories: PublicCategory[]): string {
  if (!categories.length) {
    return 'Сейчас на сайте нет доступных категорий. Загляните на [главную](/) чуть позже.';
  }
  const lines = categories
    .map((c) => `- [${c.label}](/${c.key})`)
    .join('\n');
  return `У нас такие категории номеров:\n\n${lines}\n\n- [Все номера](/)\n\nНажмите на название, чтобы открыть раздел.`;
}

/**
 * Проверяет, является ли сообщение вопросом о списке номеров/категорий.
 */
export function isRoomsListQuestion(text: string): boolean {
  const t = text.toLowerCase().trim();
  return (
    t.includes('какие есть номера') ||
    t.includes('показать номера') ||
    t === 'номера' ||
    t.includes('категории номеров')
  );
}

/**
 * Пытается найти локальный ответ на основе текста сообщения.
 * Тексты capabilities и cancel_booking передаются из БД (для гибкости).
 */
export function tryLocalAnswer(
  text: string,
  capabilities?: string,
  cancelBooking?: string
): string | null {
  const t = text.toLowerCase().trim();

  // Вопрос о возможностях
  if (
    t === 'что я могу' ||
    t === 'что ты умеешь' ||
    t.includes('что ты можешь') ||
    t.includes('твои возможности')
  ) {
    return capabilities || null;
  }

  // Вопрос об отмене брони
  if (
    (t.includes('отмен') &&
      (t.includes('брон') || t.includes('заказ') || t.includes('заявк'))) ||
    t.includes('как отменить') ||
    t === 'отмена бронирования' ||
    t === 'отмена брони'
  ) {
    return cancelBooking || null;
  }

  return null;
}