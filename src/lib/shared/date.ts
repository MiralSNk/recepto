/**
 * Форматирует объект Date в строку YYYY-MM-DD.
 * Используется для сохранения дат в формате, совместимом с БД.
 */
export function toLocalYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}