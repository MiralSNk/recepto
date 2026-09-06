/**
 * Категория мест рядом с отелем.
 * Соответствует строке таблицы place_categories.
 */
export interface PlaceCategory {
  id: number;
  category_key: string;
  label: string;
  sort_order: number;
}

/**
 * Данные для создания категории места.
 */
export type PlaceCategoryCreate = Omit<PlaceCategory, 'id'>;

/**
 * Данные для обновления категории места (частичное).
 */
export type PlaceCategoryUpdate = Partial<PlaceCategoryCreate>;