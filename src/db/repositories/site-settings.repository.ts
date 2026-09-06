/**
 * Репозиторий для работы с глобальными настройками сайта (палитра, SEO, лого и т.д.).
 * Значения хранятся в JSON.
 */
export interface ISiteSettingsRepository {
  /**
   * Получить значение настройки по ключу (распарсенный JSON или примитив).
   */
  getSetting(key: string): Promise<any | null>;

  /**
   * Получить несколько настроек одним запросом (вместо N отдельных SELECT).
   * Ключи, которых нет в БД, отсутствуют в результате.
   */
  getSettings(keys: string[]): Promise<Record<string, any>>;

  /**
   * Установить значение настройки (создать или обновить).
   */
  setSetting(key: string, value: any): Promise<void>;
}