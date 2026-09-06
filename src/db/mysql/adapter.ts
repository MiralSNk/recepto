import 'server-only';
import type { Pool } from 'mysql2/promise';
import type { IDatabaseAdapter } from '@/db/repositories/database-adapter';
import { MySQLCategoryRepository } from './repositories/category-repository';
import { MySQLRoomRepository } from './repositories/room-repository';
import { MySQLUserRepository } from './repositories/user-repository';
import { MySQLBookingRepository } from './repositories/booking-repository';
import { MySQLChatRepository } from './repositories/chat-repository';
import { MySQLPlaceRepository } from './repositories/place-repository';
import { MySQLSiteSettingsRepository } from './repositories/site-settings-repository';
import { MySQLAmenityRepository } from './repositories/amenity-repository';
import { MySQLTariffRepository } from './repositories/tariff-repository';
import { MySQLPlaceCategoryRepository } from './repositories/place-category-repository';
import { MySQLUnansweredQueryRepository } from './repositories/unanswered-query-repository';

/**
 * Адаптер базы данных MySQL, реализующий IDatabaseAdapter.
 * Объединяет все репозитории и предоставляет транзакции.
 */
export class MySQLAdapter implements IDatabaseAdapter {
  public categories: MySQLCategoryRepository;
  public rooms: MySQLRoomRepository;
  public users: MySQLUserRepository;
  public bookings: MySQLBookingRepository;
  public chat: MySQLChatRepository;
  public places: MySQLPlaceRepository;
  public siteSettings: MySQLSiteSettingsRepository;
  public amenities: MySQLAmenityRepository;
  public tariffs: MySQLTariffRepository;
  public placeCategories: MySQLPlaceCategoryRepository;
  public unansweredQueries: MySQLUnansweredQueryRepository;

  constructor(private pool: Pool) {
    this.categories = new MySQLCategoryRepository(pool);
    this.rooms = new MySQLRoomRepository(pool);
    this.users = new MySQLUserRepository(pool);
    this.bookings = new MySQLBookingRepository(pool);
    this.chat = new MySQLChatRepository(pool);
    this.places = new MySQLPlaceRepository(pool);
    this.siteSettings = new MySQLSiteSettingsRepository(pool);
    this.amenities = new MySQLAmenityRepository(pool);
    this.tariffs = new MySQLTariffRepository(pool);
    this.placeCategories = new MySQLPlaceCategoryRepository(pool);
    this.unansweredQueries = new MySQLUnansweredQueryRepository(pool);
  }

  /**
   * Выполнить переданную функцию внутри транзакции.
   * Для выполнения используется отдельное соединение, оборачиваемое в адаптер.
   */
  async transaction<T>(fn: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T> {
    const conn = await this.pool.getConnection();
    const txAdapter = new MySQLAdapter(conn as unknown as Pool);
    try {
      await conn.beginTransaction();
      const result = await fn(txAdapter);
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}