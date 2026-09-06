/**
 * Репозиторий для работы с настройками и быстрыми кнопками чат-бота.
 */
export interface IChatRepository {
  /**
   * Получить текстовую настройку по ключу.
   */
  getSetting(key: string): Promise<string | null>;

  /**
   * Записать текстовую настройку (создать или обновить).
   */
  setSetting(key: string, value: string): Promise<void>;

  /**
   * Получить все видимые быстрые кнопки (сортировка по sort_order).
   */
  getQuickReplies(): Promise<{
    id: number;
    label: string;
    action: string;
    sort_order: number;
  }[]>;

  /**
   * Создать новую быструю кнопку.
   */
  createQuickReply(data: {
    label: string;
    action: string;
    sort_order?: number;
    is_visible?: boolean;
  }): Promise<{ id: number }>;

  /**
   * Обновить быструю кнопку по id.
   */
  updateQuickReply(
    id: number,
    data: Partial<{
      label: string;
      action: string;
      sort_order: number;
      is_visible: boolean;
    }>
  ): Promise<void>;

  /**
   * Удалить быструю кнопку по id.
   */
  deleteQuickReply(id: number): Promise<void>;
}