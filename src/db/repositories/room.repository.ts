import type { Room, AdminRoom, AdminRoomCreate, AdminRoomUpdate } from '@/types';

/**
 * Репозиторий для работы с номерами и связанными данными (удобства, услуги, изображения).
 */
export interface IRoomRepository {
  /**
   * Получить все опубликованные номера (публичная часть).
   * Категория должна быть видимой.
   */
  getAllRooms(): Promise<Room[]>;

  /**
   * Получить опубликованные номера по категории (с возможным фильтром по минимальному числу гостей).
   * @param category Ключ категории или 'all' для всех
   * @param minGuest Минимальное количество гостей (0 – без фильтра)
   */
  getRoomsByCategory(category: string, minGuest?: number): Promise<Room[]>;

  /**
   * Получить опубликованный номер по id (с учётом видимости категории).
   */
  getRoomById(id: number): Promise<Room | undefined>;

  /**
   * Получить номер по id для админки (без учёта публикации и видимости).
   */
  getAdminRoomById(id: number): Promise<AdminRoom | null>;

  /**
   * Получить список номеров для админки с возможностью фильтрации и поиска.
   */
  getAdminRooms(filters?: {
    category?: string;
    search?: string;
  }): Promise<AdminRoom[]>;

  /**
   * Создать номер вместе со связями (удобства, доп. услуги, изображения).
   */
  createRoom(data: AdminRoomCreate): Promise<AdminRoom>;

  /**
   * Обновить номер по id. Связи (amenities, extras, images) обновляются только если явно переданы.
   */
  updateRoom(
    id: number,
    data: AdminRoomUpdate
  ): Promise<AdminRoom | null>;

  /**
   * Удалить номер по id (каскадно удаляются связи).
   */
  deleteRoom(id: number): Promise<void>;

  /**
   * Массово обновить цены для списка номеров.
   * @returns Количество обновлённых записей.
   */
  bulkUpdatePrices(
    ids: number[],
    prices: Partial<{
      price: number;
      price_day: number;
      price_half_day: number;
      old_price: number | null;
    }>
  ): Promise<number>;
}