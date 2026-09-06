import 'server-only';
import mysql, { Pool } from 'mysql2/promise';

/**
 * Создаёт пул соединений с MySQL.
 * Параметры берутся из переменных окружения.
 * Рекомендуется хранить их в .env.production или .env.local.
 */
export function createMySQLPool(env = process.env): Pool {
  return mysql.createPool({
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'recepto_hotel',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
  });
}