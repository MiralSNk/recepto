/**
 * Репозиторий для работы с местами рядом с отелем.
 */
export interface IPlaceRepository {
  /**
   * Получить только видимые места (для публичного чата).
   * Поле `category_key` соответствует таблице place_categories.
   */
  getPlaces(): Promise<
    {
      id: number;
      name: string;
      category_key: string;
      lat: number;
      lon: number;
      description: string;
      sort_order: number;
      is_visible: boolean;
    }[]
  >;

  /**
   * Получить все места (включая скрытые) для админки.
   */
  getAllPlaces(): Promise<
    {
      id: number;
      name: string;
      category_key: string;
      lat: number;
      lon: number;
      description: string;
      sort_order: number;
      is_visible: boolean;
    }[]
  >;

  /**
   * Получить место по id.
   */
  getPlaceById(id: number): Promise<{
    id: number;
    name: string;
    category_key: string;
    lat: number;
    lon: number;
    description: string;
    sort_order: number;
    is_visible: boolean;
  } | null>;

  /**
   * Создать новое место.
   */
  createPlace(data: {
    name: string;
    category_key: string;
    lat: number;
    lon: number;
    description: string;
    sort_order?: number;
    is_visible?: boolean;
  }): Promise<{ id: number }>;

  /**
   * Обновить место по id.
   */
  updatePlace(
    id: number,
    data: Partial<{
      name: string;
      category_key: string;
      lat: number;
      lon: number;
      description: string;
      sort_order: number;
      is_visible: boolean;
    }>
  ): Promise<void>;

  /**
   * Удалить место по id.
   */
  deletePlace(id: number): Promise<void>;
}