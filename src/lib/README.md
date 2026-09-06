# Библиотеки и утилиты (src/lib)

В этой папке собраны вспомогательные модули, разделённые по среде выполнения: клиентские, серверные и общие.

## Структура

- `client/` – модули, предназначенные только для браузера.
- `server/` – модули, работающие исключительно на сервере (большинство содержат `import 'server-only'`; исключения — `mailer.ts`, `api-helpers.ts`, `admin-recovery-rate-limit.ts`).
- `shared/` – модули, которые могут использоваться в обеих средах (но не содержат серверной логики).
- `utils/` – мелкие независимые от среды хелперы (HTTP-запросы, форматирование телефона).
- `index.server.ts` – реэкспорт ЧАСТИ серверных модулей (auth, categories-db, chat-rooms-context, mailer, og-db, palette, pricing, rooms-db, seo, site-routes); остальные импортируются напрямую из своего файла.
- `index.client.ts` – реэкспорт всех клиентских модулей.

## Описание файлов

### `client/`
- `amenity-icons.ts` – словарь иконок удобств (ключ → React-компонент).
- `booking-draft.ts` – сохранение черновика бронирования в `localStorage`.
- `chat-local.ts` – локальные ответы чата (список категорий, возможности, отмена брони).
- `chat-storage.ts` – хранение истории сообщений чата в `localStorage`.
- `client-site-routes.ts` – проверка безопасных ссылок и преобразование URL.

### `server/`
- `admin-recovery-rate-limit.ts` – глобальный (не по IP) лимитер попыток для `/api/admin-recovery/{verify,reset}`.
- `amenities-db.ts` – фасад для получения удобств.
- `api-helpers.ts` – общие хелперы admin-роутов (`requireAdminSession`, `readJsonBody`, `revalidate` и т.д.).
- `auth.ts` – конфигурация NextAuth.
- `categories-db.ts` – фасад для получения категорий.
- `chat-rooms-context.ts` – формирование контекста номеров/категорий для ИИ.
- `constant-time-compare.ts` – таймингово-безопасное сравнение пароля/секретного слова с bcrypt-хешем (защита от user-enumeration по времени ответа).
- `file-storage.ts` – удаление файлов с диска при замене/удалении сущности.
- `mailer.ts` – отправка писем через nodemailer.
- `og-db.ts` – получение номера для OG-изображения.
- `palette.ts` – получение палитры с кэшированием.
- `places-db.ts` – фасад для получения мест (карта/чат).
- `places-search.ts` – поиск мест поблизости (OSM Overpass + локальная БД).
- `pricing.ts` – глобальные тарифные правила (`getPricingRules`) для калькулятора.
- `rate-limit.ts` – фабрика in-memory rate-лимитера (по ключу).
- `rooms-db.ts` – фасад для получения номеров.
- `seo.ts` – получение всех публичных настроек сайта (`getSiteSettings`), не только SEO-полей.
- `site-routes.ts` – серверные утилиты маршрутов и контекст ссылок.
- `tariffs-db.ts` – фасад для каталога тарифов.

### `shared/`
- `chat-utils.ts` – markdown-lite разметка сообщений чата (`formatMessage`), извлечение booking-prefill.
- `date.ts` – работа с датами.
- `formula.ts` – парсинг/вычисление формулы калькулятора цены.
- `guest-limits.ts` – приоритет лимита гостей (`resolveMaxGuests`: номер → категория → сайт).
- `og.ts` – константы OG и загрузка шрифтов.
- `price-label.ts` – подстановка `{price}` в кастомную надпись цены.
- `pricing.ts` – позиционный расчёт доплат за гостей (`calculatePrice`).
- `svg-currentcolor.ts` – замена захардкоженного fill на `currentColor` в загруженных SVG.
- `svg-sanitize.ts` – regex-based зачистка SVG перед инлайновой вставкой (без DOMPurify — сервер ограничен по памяти).
- `yandex-maps.ts` – извлечение координат из ссылки на Яндекс.Карты.

## Использование

Для серверного кода:

```typescript
import { getSiteSettings } from '@/lib/index.server';
// или напрямую
import { getSiteSettings } from '@/lib/server/seo';
```