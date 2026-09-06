# Компоненты (публичная часть)

Компоненты сгруппированы по доменам, каждый в своей папке (стили — локальный `.scss` рядом с `.tsx`). Админ-панель вынесена отдельно — см. `admin/README.md`.

## Layout / навигация

- **Header** – шапка сайта (sticky/прозрачная на главной), мобильное меню, попап телефона.
- **Footer** – подвал (контакты, соцсети).
- **MapSection** – блок с картой и контактами внизу страницы.
- **Hero** – хиро-блок главной страницы с GSAP-параллаксом.
- **ScrollToTop** – кнопка «наверх».

## Бронирование

- **BookingPanel** + **CategoryChips** – строка поиска на главной (даты, гости, категории).
- **DateRangePicker** – выбор диапазона дат (react-date-range), используется только в `BookingPanel`.
- **GuestSelector** – степпер взрослые/дети.
- **BookingForm** – модалка заявки на бронирование (`BookingFormFields`, `BookingFormProvider` — контекст + отложенная на 2 минуты отправка, `BookingButton`, `RoomSelector`, `BookingPendingToast`).

## Номера

- **RoomCard** – карточка номера в списке (со своим слайдером).
- **RoomList** – сетка карточек.
- **RoomDetail** – `RoomDetailModal` (перехватывающий роут-модалка), `RoomDetailFull` (полная страница), `RoomDetailContent` (общий контент), `FullscreenGallery`.
- **skeletons** – заглушки загрузки (`HomeSkeleton`, `RoomDetailSkeleton`).

## Чат-виджет

- **ChatWidget** – оркестратор чата (история, отправка, «печатающий» эффект).
- **ChatHeader**, **ChatMessages**, **ChatInput**, **ChatQuickReplies** – составные части.

## Прочее

- **ContactsPage** – страница «Об отеле» + форма обратной связи.
- **HomeContent** – клиентское тело главной/страницы категории, владеет URL search-параметрами.
- **JsonLd/HotelJsonLd** – серверный компонент с JSON-LD для SEO.
- **YandexCaptcha** / **YandexCaptchaLazy** – обёртка над Yandex SmartCaptcha.
- **Portal** – обёртка над `createPortal`, используется `DateRangePicker` и `GuestSelector`.

## Соглашения

- Общий hook для бесконечных слайдеров — `useGalleryTrack` (`src/hooks`), используется `RoomCard`, `RoomDetailContent`, `FullscreenGallery`.
- Иконки удобств — единый словарь `src/lib/client/amenity-icons.ts`; не заводите локальных копий (см. `AUDIT.md` про уже случившуюся рассинхронизацию в `RoomCard`).
- Известные проблемы дублирования (модалки без общего примитива, два date-picker'а и т.д.) — в корневом `AUDIT.md`.
