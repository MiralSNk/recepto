/**
 * Создаёт первого администратора в свежей базе данных.
 *
 * До этого скрипта на пустой БД (после `pnpm db:migrate`) таблица `users`
 * остаётся пустой — залогиниться в /admin буквально некому, а
 * MySQLUserRepository.createUser() никогда не вызывается ни из одного
 * API-роута (создание пользователей через UI не предусмотрено — это
 * осознанно однопользовательская админка). Без этого скрипта первый вход
 * на свежем сервере невозможен в принципе.
 *
 * Идемпотентен: если в `users` уже есть хотя бы одна строка — ничего не
 * делает и завершается успешно (безопасно случайно запустить повторно,
 * например по ошибке в деплой-скрипте).
 *
 * Использование:
 *   BOOTSTRAP_ADMIN_EMAIL=admin@example.com BOOTSTRAP_ADMIN_PASSWORD=... \
 *     node scripts/bootstrap-admin.mjs
 * либо через npm-скрипт:
 *   pnpm admin:bootstrap
 */
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { loadEnvForScript, resolveDbName } from './load-env.mjs';

// Та же стоимость хеширования, что и везде в приложении при задании/смене
// пароля — /api/admin/change-password, /api/admin-recovery/reset (см.
// src/lib/server/auth.ts и соседние роуты). Если её когда-нибудь поменяют
// там, нужно поменять и здесь.
const BCRYPT_COST = 12;

function readRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    console.error(
      `[bootstrap-admin] ОШИБКА: не задана переменная окружения ${name}. ` +
        `Укажите BOOTSTRAP_ADMIN_EMAIL и BOOTSTRAP_ADMIN_PASSWORD и запустите скрипт снова.`
    );
    process.exit(1);
  }
  return value.trim();
}

async function main() {
  loadEnvForScript();

  const email = readRequiredEnv('BOOTSTRAP_ADMIN_EMAIL');
  const password = readRequiredEnv('BOOTSTRAP_ADMIN_PASSWORD');

  // Тот же минимум, что и валидация нового пароля в /api/admin/change-password
  // (zod: min(8)) — нет смысла заводить первого админа с паролем короче того,
  // что разрешит сменить сам же продукт.
  if (password.length < 8) {
    console.error('[bootstrap-admin] ОШИБКА: BOOTSTRAP_ADMIN_PASSWORD должен быть не короче 8 символов.');
    process.exit(1);
  }

  const dbName = resolveDbName();

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
  });

  try {
    let existingCount;
    try {
      const [rows] = await connection.query('SELECT COUNT(*) AS count FROM users');
      existingCount = rows[0].count;
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_DB_ERROR') {
        console.error(
          `[bootstrap-admin] ОШИБКА: таблица users (БД «${dbName}») не найдена. ` +
            `Сначала примените миграции: pnpm db:migrate.`
        );
        process.exit(1);
      }
      throw err;
    }

    if (existingCount > 0) {
      console.log('Admin already exists, nothing to do.');
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    // secret_word_hash (миграция 017) намеренно не указываем — колонка
    // NULL-able без явного DEFAULT, поэтому MySQL сам подставит NULL:
    // восстановление по секретному слову недоступно, пока админ не задаст
    // его через /admin (честная ошибка вместо ложного чувства защищённости).
    await connection.execute('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [
      email,
      passwordHash,
      'admin',
    ]);

    console.log(`Готово: создан первый администратор (${email}).`);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('Ошибка при бутстрапе администратора:', err);
  process.exit(1);
});
