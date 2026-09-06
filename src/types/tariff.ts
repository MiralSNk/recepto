/**
 * Тариф — переиспользуемая доплата с фиксированной ценой (справочник,
 * аналог Amenity). Два builtin-тарифа (2-й гость / 3-й+ гость) заменяют
 * старые числовые site_settings second_guest_price/extra_guest_price.
 * Дополнительные тарифы создаются администратором и могут быть отмечены
 * как участвующие в калькуляторе (in_calculator) — тогда они доступны как
 * карточка в конструкторе формулы.
 */
export interface Tariff {
  id: number;
  tariff_key: string;
  label: string;
  price: number;
  is_builtin: boolean;
  in_calculator: boolean;
  sort_order: number;
}

export type TariffCreate = Omit<Tariff, 'id'>;
export type TariffUpdate = Partial<TariffCreate>;

/**
 * Привязка тарифа к номеру (room_tariffs), уже разрешённая для чтения:
 * custom_label — текст для гостя, специфичный для этого номера; price —
 * ВСЕГДА живое значение из tariffs.price (никогда не хранится в самой
 * привязке), поэтому цена физически не может разойтись с «Тарифами».
 */
export interface RoomTariffAttachment {
  tariff_id: number;
  tariff_key: string;
  label: string;
  custom_label: string;
  price: number;
}

/** Форма записи (создание/обновление номера) — без резолвленных label/price. */
export interface RoomTariffInput {
  tariff_id: number;
  custom_label: string;
}
