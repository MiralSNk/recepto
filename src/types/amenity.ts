/**
 * Удобство номера.
 * Соответствует строке таблицы amenities.
 */
export interface Amenity {
  id: number;
  amenity_key: string;
  label: string;
  icon_url: string | null;
  sort_order: number;
}

/**
 * Данные для создания удобства.
 */
export type AmenityCreate = Omit<Amenity, 'id'>;

/**
 * Данные для обновления удобства (частичное).
 */
export type AmenityUpdate = Partial<AmenityCreate>;