import { CategoryKey } from '../categories';
import { AmenityKey } from '../amenities';
import { RoomTariffAttachment, RoomTariffInput } from '../tariff';

export interface AdminRoomBase {
  id: number;
  name: string;
  category_key: CategoryKey;
  category_label?: string; // приходит из JOIN
  // Приходит из JOIN, только в публичных методах room-repository.ts —
  // фолбэк-лимит гостей категории, см. src/lib/shared/guest-limits.ts.
  category_max_guests?: number | null;
  // Две независимые цены по требованию заказчика, см. Room в
  // src/types/room.ts — price для карточек номеров, price_day для страницы
  // номера/формы бронирования/ИИ-помощника.
  price: number;
  price_day: number;
  old_price: number | null;
  price_half_day: number | null;

  price_label?: string | null;
  price_day_label?: string | null;
  price_half_day_label?: string | null;

  area: number | null;
  guests: number | null;
  extra_guest_capacity: number;
  description: string;
  full_description: string;
  is_published: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface AdminRoom extends AdminRoomBase {
  amenities: AmenityKey[];
  extras: string[];
  images: string[];
  roomTariffs: RoomTariffAttachment[];
}

// Не Omit<AdminRoom, ...> — форма записи tariffs (RoomTariffInput[]) отличается
// от формы чтения roomTariffs (RoomTariffAttachment[], label/price резолвятся
// на сервере из каталога), поэтому поля перечислены явно.
export type AdminRoomCreate = Omit<AdminRoomBase, 'id' | 'created_at' | 'updated_at'> & {
  amenities?: AmenityKey[];
  extras?: string[];
  images?: string[];
  tariffs?: RoomTariffInput[];
};
export type AdminRoomUpdate = Partial<AdminRoomCreate>;