/**
 * Общая загрузка переменных окружения для standalone-скриптов, работающих
 * с БД напрямую (migrate-mysql.mjs, bootstrap-admin.mjs) — сами они не
 * поднимают Next.js-приложение, поэтому .env.* не подхватывается фреймворком
 * автоматически.
 *
 * Приоритет:
 *   1. .env.production — если файл существует. Именно этот файл считается
 *      источником истины для запущенного деплоя (см. /api/admin/settings
 *      и ecosystem.config.js — продакшен работает с .env.production).
 *   2. иначе .env.local — если существует (локальная разработка).
 *   3. иначе — переменные окружения процесса как есть (например, скрипт
 *      запущен через `dotenv -e .env.test -- ...` снаружи, как
 *      db:migrate:test, либо DB_* заданы напрямую в shell/systemd).
 *
 * Раньше при отсутствии .env.local (например, на свежем сервере, где есть
 * только .env.production) скрипты молча уезжали на дефолты
 * localhost/root/пустой пароль внутри mysql.createConnection — реальный риск
 * незаметно применить миграцию/бутстрап не к той базе. Если НИ ОДИН файл не
 * найден И ни одна из переменных БД не задана в process.env явно — падаем
 * сразу с понятной ошибкой вместо тихого дефолта.
 */
import fs from 'fs';
import path from 'path';

const DB_VARS = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

function parseEnvFile(content) {
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    result[key] = value.replace(/^(['"])(.*)\1$/, '$2');
  }
  return result;
}

// Значения из файла НЕ перезаписывают уже заданные process.env — так же
// ведёт себя dotenv: реальные переменные окружения (shell, systemd,
// dotenv-cli снаружи) всегда в приоритете над файлом.
function applyEnvFile(filePath) {
  const parsed = parseEnvFile(fs.readFileSync(filePath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function loadEnvForScript() {
  const prodPath = path.join(process.cwd(), '.env.production');
  const localPath = path.join(process.cwd(), '.env.local');

  if (fs.existsSync(prodPath)) {
    applyEnvFile(prodPath);
    console.log('[env] Загружены переменные окружения из .env.production');
    return;
  }

  if (fs.existsSync(localPath)) {
    applyEnvFile(localPath);
    console.log('[env] Загружены переменные окружения из .env.local');
    return;
  }

  const hasAnyDbVar = DB_VARS.some((key) => process.env[key] !== undefined);
  if (!hasAnyDbVar) {
    console.error(
      `[env] ОШИБКА: не найден ни .env.production, ни .env.local, и ни одна из ` +
        `переменных окружения БД (${DB_VARS.join(', ')}) не задана в process.env. ` +
        `Отказываюсь молча подключаться с дефолтами localhost/root без пароля — ` +
        `это может привести к применению миграций/бутстрапа не к той базе данных. ` +
        `Создайте .env.production (или .env.local) в корне проекта, либо задайте ` +
        `переменные окружения БД явно.`
    );
    process.exit(1);
  }

  console.log(
    '[env] Файлы .env.production/.env.local не найдены — использую переменные окружения процесса напрямую.'
  );
}

// Имя БД валидируется одинаково во всех standalone-скриптах — приходит из
// окружения (не от пользователя приложения), но лишняя проверка не помешает,
// раз имя подставляется прямо в SQL (CREATE DATABASE/USE не поддерживают
// плейсхолдеры).
export function resolveDbName() {
  const name = process.env.DB_NAME || 'recepto_hotel';
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Некорректное имя БД в DB_NAME: ${name}`);
  }
  return name;
}
