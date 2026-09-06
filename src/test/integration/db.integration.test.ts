/**
 * Интеграционные тесты против настоящей MySQL (docker-compose, см.
 * `pnpm test:integration`), а не моков — проверяют, что реальные SQL-запросы
 * репозиториев действительно работают на актуальной схеме после всех миграций.
 *
 * Каждый тест пишет и читает данные внутри транзакции, которую откатывает в
 * конце (кидает ROLLBACK_SIGNAL и ловит его снаружи) — БД остаётся чистой
 * независимо от того, сколько раз прогоняется тестовый набор.
 */
import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { getDB } from '@/db';
import { authOptions } from '@/lib/server/auth';
import type { IDatabaseAdapter } from '@/db/repositories/database-adapter';
import type { CredentialsConfig } from 'next-auth/providers/credentials';

const ROLLBACK_SIGNAL = Symbol('rollback');

/** Выполняет fn внутри транзакции и всегда откатывает её после. */
async function withRollback(fn: (db: IDatabaseAdapter) => Promise<void>): Promise<void> {
  try {
    await getDB().transaction(async (tx) => {
      await fn(tx);
      throw ROLLBACK_SIGNAL;
    });
  } catch (err) {
    if (err !== ROLLBACK_SIGNAL) throw err;
  }
}

describe('integration: категории и номера', () => {
  it('создаёт категорию и номер, читает обратно через getAdminRoomById', async () => {
    await withRollback(async (db) => {
      const category = await db.categories.createCategory({
        key: `test_cat_${Date.now()}`,
        label: 'Тестовая категория',
        is_visible: true,
      });

      const created = await db.rooms.createRoom({
        name: 'Тестовый номер',
        category_key: category.key,
        price: 3000,
        old_price: null,
        price_day: 3000,
        price_half_day: null,
        price_label: null,
        price_day_label: null,
        price_half_day_label: null,
        area: 20,
        guests: 2,
        extra_guest_capacity: 1,
        description: 'кратко',
        full_description: 'полностью',
        is_published: true,
        sort_order: 0,
        amenities: [],
        extras: ['Завтрак включён'],
        images: [],
      });

      const fetched = await db.rooms.getAdminRoomById(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.name).toBe('Тестовый номер');
      expect(fetched?.extra_guest_capacity).toBe(1);
      expect(fetched?.extras).toEqual(['Завтрак включён']);

      const updated = await db.rooms.updateRoom(created.id, { price_day: 3500 });
      expect(updated?.price_day).toBe(3500);

      await db.rooms.deleteRoom(created.id);
      expect(await db.rooms.getAdminRoomById(created.id)).toBeNull();
    });
  });
});

describe('integration: бронирование', () => {
  it('создаёт заявку и находит её по id', async () => {
    await withRollback(async (db) => {
      const { id } = await db.bookings.createBooking({
        name: 'Иван Тестов',
        phone: '+79001112233',
        adults: 2,
        children: 1,
        comment: 'Интеграционный тест',
      });
      expect(id).toBeGreaterThan(0);

      const booking = await db.bookings.getBookingById(id);
      expect(booking).not.toBeNull();
      expect(booking.name).toBe('Иван Тестов');
      expect(booking.status).toBe('new');

      await db.bookings.updateBookingStatus(id, 'confirmed');
      const updated = await db.bookings.getBookingById(id);
      expect(updated.status).toBe('confirmed');
    });
  });
});

describe('integration: вход администратора', () => {
  it('находит пользователя по email и проверяет пароль через bcrypt', async () => {
    await withRollback(async (db) => {
      const email = `test-${Date.now()}@example.com`;
      const passwordHash = await bcrypt.hash('correct-horse-battery-staple', 10);
      await db.users.createUser({ email, password_hash: passwordHash, role: 'admin' });

      const user = await db.users.findByEmail(email);
      expect(user).not.toBeNull();
      expect(await bcrypt.compare('correct-horse-battery-staple', user!.password_hash)).toBe(
        true
      );
      expect(await bcrypt.compare('wrong-password', user!.password_hash)).toBe(false);
    });
  });

  it('findByEmail возвращает null для несуществующего пользователя', async () => {
    const user = await getDB().users.findByEmail('nobody-with-this-email@example.com');
    expect(user).toBeNull();
  });

  // Не через withRollback: authorize() внутри дёргает getDB() напрямую —
  // это отдельное соединение из пула, а не то, что держит транзакцию теста,
  // поэтому незакоммиченную запись оно бы просто не увидело (транзакционная
  // изоляция). Уникальный email на каждый прогон — accумуляция строк в
  // одноразовой тестовой БД не проблема (нет репозиторного метода на delete
  // пользователя, заводить его только ради очистки тестов — лишнее).
  it('authorize() из NextAuth пускает по верным данным и отклоняет по неверным одинаковым сообщением', async () => {
    const email = `authorize-${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash('right-password', 10);
    await getDB().users.createUser({ email, password_hash: passwordHash, role: 'admin' });

    const provider = authOptions.providers[0] as unknown as CredentialsConfig;
    // next-auth's Credentials() фабрика подменяет provider.authorize стабом
    // `() => null` — настоящая функция, которую передали в CredentialsProvider(),
    // лежит в provider.options.authorize (её же в рантайме дёргает внутренний
    // HTTP-роут NextAuth). Обнаружено этим же тестом: без .options было
    // молчаливое `null` вместо пользователя/ошибки — see debug run.
    const authorize = (provider.options as unknown as CredentialsConfig).authorize!;

    const user = await authorize({ email, password: 'right-password' }, {} as never);
    expect(user).toMatchObject({ email });

    // Единое сообщение и для неверного пароля, и для несуществующего email —
    // проверка на user enumeration (см. Фазу 1 аудита).
    let wrongPasswordError: Error | null = null;
    try {
      await authorize({ email, password: 'wrong-password' }, {} as never);
    } catch (err) {
      wrongPasswordError = err as Error;
    }
    expect(wrongPasswordError?.message).toBe('Неверный email или пароль');

    let unknownEmailError: Error | null = null;
    try {
      await authorize({ email: 'nobody-at-all@example.com', password: 'anything' }, {} as never);
    } catch (err) {
      unknownEmailError = err as Error;
    }
    expect(unknownEmailError?.message).toBe(wrongPasswordError?.message);
  });
});
