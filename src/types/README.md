# Типы приложения

В этой папке собраны все TypeScript-типы и интерфейсы, используемые в проекте.

## Структура

- `categories.ts` – тип `CategoryKey` (строка, значение берётся из БД).
- `amenities.ts` – тип `AmenityKey` (строка, значение из таблицы amenities).
- `room.ts` – публичная модель номера (`Room`).
- `guests.ts` – модель количества гостей.
- `amenity.ts` – тип удобства (`Amenity`) и типы для создания/обновления.
- `tariff.ts` – тариф-справочник (`Tariff`) и привязка тарифа к номеру (`RoomTariffAttachment`, `RoomTariffInput`).
- `booking.ts` – заявка на бронирование (`Booking`, `BookingStatus`).
- `place-category.ts` – категория места (`PlaceCategory`).
- `unanswered-query.ts` – неотвеченный запрос (`UnansweredQuery`).
- `admin/` – типы, специфичные для админ-панели (`AdminCategory`, `AdminRoom`).
- `index.ts` – реэкспорт всех типов.

## Примечания

- Раньше здесь были статические справочники (`amenityLabels`, `categoryMap`). Они удалены, так как данные теперь загружаются из БД.
- Дефолтные встроенные иконки для трёх стандартных удобств (wifi/conditioner/tv) вынесены в `src/lib/client/amenity-icons.ts`. Для остальных (и любых новых, добавленных в админке) используется поле `icon_url` из таблицы `amenities` (см. миграцию 011) — статический словарь работает только как fallback, если `icon_url` не задан.