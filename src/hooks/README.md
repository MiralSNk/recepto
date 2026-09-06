# Хуки

- **useFileUpload** – загружает `File` через `FormData` на `/api/admin/upload`, отслеживает `uploading`/`error`, вызывает `onSuccess`/`onError`. Используется в `RoomFormModal`, `HomeAdminClient`, `AmenitiesClient`.
- **useGalleryTrack** – движок GSAP-слайдера (обычный или бесконечный через клонирование крайних слайдов), drag/touch/click-зоны. Используется `RoomCard`, `RoomDetailContent`, `FullscreenGallery`. Экспортирует также `buildClonedSlides`.
- **usePublicRooms** – фетчит `/api/rooms/public` для выпадающего списка номеров в `BookingForm`.

Барrel-экспорт — `index.ts`.

## Соглашения

Хук — для логики, переиспользуемой минимум в 2 компонентах. Одноразовая логика остаётся внутри компонента. Кандидаты на новые хуки (пока не выделены, см. `AUDIT.md`) — `useClickOutside`/`usePopoverPosition` (сейчас дублируются в `DateRangePicker` и `GuestSelector`).
