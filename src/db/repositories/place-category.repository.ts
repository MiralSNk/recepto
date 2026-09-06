import type { PlaceCategory, PlaceCategoryCreate, PlaceCategoryUpdate } from '@/types';

/**
 * Репозиторий для работы со справочником категорий мест.
 */
export interface IPlaceCategoryRepository {
  /**
   * Получить все категории мест (сортировка по sort_order).
   */
  getAllPlaceCategories(): Promise<PlaceCategory[]>;

  /**
   * Создать новую категорию мест.
   */
  createPlaceCategory(data: PlaceCategoryCreate): Promise<{ id: number }>;

  /**
   * Обновить категорию мест по id.
   */
  updatePlaceCategory(
    id: number,
    data: PlaceCategoryUpdate
  ): Promise<void>;

  /**
   * Удалить категорию мест по id.
   */
  deletePlaceCategory(id: number): Promise<void>;
}