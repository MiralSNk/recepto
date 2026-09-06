import type { AdminCategory } from '@/types';

/**
 * Репозиторий для работы с категориями номеров.
 */
export interface ICategoryRepository {
  /**
   * Получить все категории (включая скрытые) для админки.
   * Сортировка: сначала по sort_order (по убыванию), затем по id (по возрастанию).
   */
  getAllCategories(): Promise<AdminCategory[]>;

  /**
   * Получить только видимые категории для публичной части.
   * Возвращает только поля key, label, sort_order, max_guests.
   */
  getVisibleCategories(): Promise<
    Pick<AdminCategory, 'key' | 'label' | 'sort_order' | 'max_guests'>[]
  >;

  /**
   * Получить категорию по её уникальному ключу.
   * @param key Ключ категории (например, 'standard')
   */
  getCategoryByKey(key: string): Promise<AdminCategory | null>;

  /**
   * Получить текстовое название категории по ключу.
   * Если ключ 'all', возвращает 'Все номера'.
   */
  getCategoryLabel(key: string): Promise<string>;

  /**
   * Проверить существование видимой категории с указанным ключом.
   */
  categoryExists(key: string): Promise<boolean>;

  /**
   * Проверить, является ли ключ валидной категорией (включая 'all').
   */
  isValidCategory(key: string): Promise<boolean>;

  /**
   * Создать новую категорию.
   */
  createCategory(data: {
    key: string;
    label: string;
    sort_order?: number;
    is_visible?: boolean;
    max_guests?: number | null;
  }): Promise<AdminCategory>;

  /**
   * Обновить категорию по id.
   * Обновляются только переданные поля.
   */
  updateCategory(
    id: number,
    data: Partial<{
      key: string;
      label: string;
      sort_order: number;
      is_visible: boolean;
      max_guests: number | null;
    }>
  ): Promise<AdminCategory | null>;

  /**
   * Удалить категорию по id.
   */
  deleteCategory(id: number): Promise<void>;

  /**
   * Подсчитать количество номеров в категории.
   * @param categoryKey Ключ категории
   */
  countRoomsInCategory(categoryKey: string): Promise<number>;

  /**
   * Получить категорию по id.
   */
  getCategoryById(id: number): Promise<AdminCategory | null>;
}