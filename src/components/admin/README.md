# Компоненты админ-панели

## Структура

- **AdminLayout** – общий каркас с сайдбаром и шапкой.
- **Header** – шапка с кнопкой выхода.
- **Sidebar** – навигация по разделам.
- **CategoriesClient** – управление категориями номеров.
- **AmenitiesClient** – управление удобствами номеров (иконки).
- **RoomsClient** и вложенные (`RoomsTable`, `RoomFormModal`, `BulkPriceModal`) – управление номерами.
- **PricingAdminClient** и вложенные из `TariffsAdminClient` (`TariffCatalog`, `FormulaConstructor`, `formula-builder`) – глобальные правила цены (доплаты за гостей), каталог тарифов, конструктор формулы калькулятора.
- **ChatAdminClient** и вложенные (`TextsSection`, `QuickRepliesSection`, `PlacesSection`, `PlaceModal`, `UnansweredQueriesSection`) – управление чат-ботом.
- **HomeAdminClient** – настройки главной страницы.
- **PaletteAdmin** – редактирование цветовой палитры.
- **SeoAdminClient** – SEO-поля.
- **SettingsAdminClient** – переменные окружения.

## Соглашения

- Для HTTP-запросов используем обёртку `@/lib/utils/api`.
- Загрузка файлов – хук `useFileUpload`.
- Все компоненты – клиентские (`'use client'`).
- Стили подключаются локально (`.scss` в каждой папке) и используют миксины проекта.

## Добавление нового раздела

1. Создайте папку компонента со SCSS.
2. Добавьте пункт в `Sidebar`.
3. При необходимости создайте API-маршруты.