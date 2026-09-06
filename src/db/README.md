# База данных (Data Access Layer)

Этот слой отвечает за взаимодействие с MySQL. Он построен на паттерне «Репозиторий» и предоставляет единый интерфейс для всех операций с данными.

## Структура

- `repositories/` – интерфейсы (контракты) для каждой сущности.
  - Каждый файл описывает методы, которые должны быть реализованы.
  - Имена интерфейсов начинаются с `I`, например `ICategoryRepository`.
- `mysql/` – реализация репозиториев для MySQL.
  - `connection.ts` – настройка пула соединений.
  - `mappers.ts` – преобразование строк из БД в объекты приложения.
  - `repositories/` – конкретные классы, реализующие интерфейсы.
  - `adapter.ts` – объединяет все репозитории и предоставляет транзакции.
- `index.ts` – фабрика `getDB()`, возвращающая синглтон адаптера.

## Как использовать

```typescript
import { getDB } from '@/db';

const db = getDB();
const categories = await db.categories.getAllCategories();
const room = await db.rooms.getRoomById(5);
```

## Транзакции

```typescript
await db.transaction(async (tx) => {
  // используйте tx.categories, tx.rooms и т.д.
  const category = await tx.categories.createCategory({ ... });
  await tx.rooms.createRoom({ ... });
});
```

## Тестирование

Юнит-тесты находятся в __tests__/ и используют Vitest с моками пула соединений. Запуск:

```bash
pnpm test
```

Для тестов используется заглушка server-only (см. src/test/server-only-mock.ts), а конфигурация – vitest.config.ts.

## Важные замечания

Все модули содержат import 'server-only', чтобы предотвратить использование на клиенте.
Схема БД описана в миграциях migrations/mysql/.