import type { Amenity, AmenityCreate, AmenityUpdate } from '@/types';

/**
 * Репозиторий для работы со справочником удобств.
 */
export interface IAmenityRepository {
  /**
   * Получить все удобства (сортировка по sort_order).
   */
  getAllAmenities(): Promise<Amenity[]>;

  /**
   * Получить удобство по уникальному ключу.
   */
  getAmenityByKey(key: string): Promise<Amenity | null>;

  /**
   * Получить удобство по id.
   */
  getAmenityById(id: number): Promise<Amenity | null>;

  /**
   * Создать новое удобство.
   */
  createAmenity(data: Partial<AmenityCreate> & Pick<AmenityCreate, 'amenity_key' | 'label'>): Promise<{ id: number }>;

  /**
   * Обновить удобство по id.
   */
  updateAmenity(
    id: number,
    data: Partial<AmenityUpdate>
  ): Promise<void>;

  /**
   * Удалить удобство по id.
   */
  deleteAmenity(id: number): Promise<void>;
}