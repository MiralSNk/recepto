import type { Tariff, TariffCreate, TariffUpdate } from '@/types';

/**
 * Репозиторий для работы со справочником тарифов.
 */
export interface ITariffRepository {
  /**
   * Получить все тарифы (сортировка по sort_order).
   */
  getAllTariffs(): Promise<Tariff[]>;

  /**
   * Получить тариф по id.
   */
  getTariffById(id: number): Promise<Tariff | null>;

  /**
   * Получить тариф по уникальному ключу.
   */
  getTariffByKey(key: string): Promise<Tariff | null>;

  /**
   * Создать новый тариф.
   */
  createTariff(data: Partial<TariffCreate> & Pick<TariffCreate, 'tariff_key' | 'label'>): Promise<{ id: number }>;

  /**
   * Обновить тариф по id.
   */
  updateTariff(id: number, data: Partial<TariffUpdate>): Promise<void>;

  /**
   * Удалить тариф по id.
   */
  deleteTariff(id: number): Promise<void>;

  /**
   * Число номеров, к которым привязан данный тариф (room_tariffs).
   * Используется guard'ами удаления/выключения тарифа.
   */
  countRoomTariffUsage(tariffId: number): Promise<number>;
}
