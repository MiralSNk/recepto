import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { loadEnvForScript, resolveDbName } from './load-env.mjs';

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations', 'mysql');

// Только пронумерованные файлы миграций (001_*.sql, 002_*.sql, ...).
// seed-chat.sql — необязательные сид-данные, применяется вручную при необходимости.
function listMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort();
}

async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(connection) {
  const [rows] = await connection.query('SELECT filename FROM schema_migrations');
  return new Set(rows.map((r) => r.filename));
}

// Часть миграций не идемпотентна (ALTER TABLE ADD COLUMN/RENAME/ADD INDEX без
// проверки и т.п.) — при повторном/ручном применении на уже мигрированной БД
// падают с ошибкой "уже существует". Вместо того чтобы гадать заранее, какие
// файлы уже применялись вручную (история деплоя это не отслеживала), пробуем
// выполнить КАЖДЫЙ СТЕЙТМЕНТ ФАЙЛА ПО ОТДЕЛЬНОСТИ и ловим именно эти коды
// ошибок MySQL — они однозначно означают «объект уже существует», а не
// реальную проблему. Стейтмент за стейтментом, а не файл целиком — иначе один
// уже применённый ALTER в начале файла (multipleStatements — один batch)
// заблокировал бы попытку выполнить остальные, ещё не применённые statements
// того же файла.
const ALREADY_EXISTS_ERRNOS = new Set([
  1050, // ER_TABLE_EXISTS_ERROR
  1054, // ER_BAD_FIELD_ERROR — обычно колонка, которую тут же переименовывают/меняют, уже переименована
  1060, // ER_DUP_FIELDNAME (колонка уже есть)
  1061, // ER_DUP_KEYNAME (индекс уже есть)
  1072, // ER_KEY_COLUMN_DOES_NOT_EXITS — FK/индекс ссылается на колонку, уже переименованную более поздней миграцией
  1091, // ER_CANT_DROP_FIELD_OR_KEY (пытаемся удалить то, чего уже нет)
  1826, // ER_FK_DUP_NAME (foreign key уже есть)
  3822, // ER_DUP_CONSTRAINT_NAME (CHECK-constraint уже есть)
]);

// Простое разбиение на стейтменты по `;` в конце строки — безопасно для
// текущих файлов миграций (проверено: ни в одном нет `;` внутри строковых
// значений или однострочных комментариев). Каждый чанк передаётся в MySQL как
// есть, включая ведущие `--`-комментарии, MySQL их корректно игнорирует.
function splitStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => {
      const withoutComments = s.replace(/^--.*$/gm, '').trim();
      return withoutComments.length > 0;
    });
}

async function runMigration() {
  const dbName = resolveDbName();

  // Подключаемся без выбора БД, создаём/выбираем её сами — так миграции
  // (начиная с 001) работают одинаково и для боевой, и для тестовой БД,
  // без хардкода имени внутри самих .sql-файлов.
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE \`${dbName}\``);

    await ensureMigrationsTable(connection);

    const files = listMigrationFiles();
    const applied = await getAppliedMigrations(connection);
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log('Все миграции уже применены, новых нет.');
      return;
    }

    let appliedFiles = 0;
    let statementsRun = 0;
    let statementsSkipped = 0;

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const statements = splitStatements(sql);
      console.log(`Применяем миграцию: ${file} (${statements.length} стейтментов)`);

      for (const statement of statements) {
        try {
          await connection.query(statement);
          statementsRun++;
        } catch (err) {
          if (ALREADY_EXISTS_ERRNOS.has(err.errno)) {
            console.warn(`  ${file}: стейтмент уже применён ранее (${err.code}) — пропускаю.`);
            statementsSkipped++;
          } else {
            throw err;
          }
        }
      }

      await connection.execute('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
      appliedFiles++;
    }

    console.log(
      `Готово: обработано файлов ${appliedFiles}, выполнено стейтментов ${statementsRun}, пропущено как уже сделанные ${statementsSkipped} (${pending.join(', ')}).`
    );
  } finally {
    await connection.end();
  }
}

loadEnvForScript();

runMigration().catch((err) => {
  console.error('Ошибка при миграции:', err);
  process.exit(1);
});
