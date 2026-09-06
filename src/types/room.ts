import { CategoryKey } from "@/types/categories";
import { AmenityKey } from "./amenities";
import { RoomTariffAttachment } from "./tariff";

export interface Room {
  id: number;
  name: string;
  category: CategoryKey;
  // Фолбэк-лимит гостей категории — см. src/lib/shared/guest-limits.ts.
  // null — у категории нет своего лимита.
  categoryMaxGuests: number | null;
  // Две умышленно независимые цены (не синхронизируются) — заказчик
  // подтвердил, что это разный функционал, а не рассинхрон:
  // price — показывается только на карточках номеров (главная/список),
  // price_day — везде остальное (страница номера, форма бронирования,
  // ИИ-помощник). См. RoomFormModal.tsx.
  price: number;
  price_day: number;
  oldPrice?: number;
  price_half_day?: number;

  price_label?: string | null;
  price_day_label?: string | null;
  price_half_day_label?: string | null;

  area: number | null;
  guests: number | null;
  extraGuestCapacity: number;
  description: string;
  fullDescription: string;
  amenities: AmenityKey[];
  extras: string[];
  images: string[];
  roomTariffs: RoomTariffAttachment[];
}