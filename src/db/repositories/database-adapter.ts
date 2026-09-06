import type { ICategoryRepository } from './category.repository';
import type { IRoomRepository } from './room.repository';
import type { IUserRepository } from './user.repository';
import type { IBookingRepository } from './booking.repository';
import type { IChatRepository } from './chat.repository';
import type { IPlaceRepository } from './place.repository';
import type { ISiteSettingsRepository } from './site-settings.repository';
import type { IAmenityRepository } from './amenity.repository';
import type { ITariffRepository } from './tariff.repository';
import type { IPlaceCategoryRepository } from './place-category.repository';
import type { IUnansweredQueryRepository } from './unanswered-query.repository';

/**
 * Объединяющий интерфейс адаптера базы данных.
 * Предоставляет доступ ко всем репозиториям и транзакции.
 */
export interface IDatabaseAdapter {
  categories: ICategoryRepository;
  rooms: IRoomRepository;
  users: IUserRepository;
  bookings: IBookingRepository;
  chat: IChatRepository;
  places: IPlaceRepository;
  siteSettings: ISiteSettingsRepository;
  amenities: IAmenityRepository;
  tariffs: ITariffRepository;
  placeCategories: IPlaceCategoryRepository;
  unansweredQueries: IUnansweredQueryRepository;

  /**
   * Выполнить функцию внутри транзакции.
   * Передаётся адаптер, привязанный к транзакционному соединению.
   */
  transaction<T>(fn: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T>;
}