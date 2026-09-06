/**
 * Единственное место, где решается приоритет лимита гостей в пикере:
 * вместимость конкретного номера (guests + extra_guest_capacity), если она
 * задана → лимит его категории, если задан → общий сайтовый лимит.
 * Используется и на сервере (страница категории), и на клиенте (форма
 * бронирования) — чтобы значение не могло разойтись между ними.
 */
export function resolveMaxGuests({
  roomGuests,
  roomExtraCapacity,
  categoryMaxGuests,
  siteMaxGuestsAbsolute,
}: {
  roomGuests?: number | null;
  roomExtraCapacity?: number | null;
  categoryMaxGuests?: number | null;
  siteMaxGuestsAbsolute: number;
}): number {
  if (roomGuests != null) return roomGuests + (roomExtraCapacity ?? 0);
  if (categoryMaxGuests != null) return categoryMaxGuests;
  return siteMaxGuestsAbsolute;
}
