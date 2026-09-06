import 'server-only';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { IUserRepository } from '@/db/repositories/user.repository';

/**
 * Реализация репозитория пользователей для MySQL.
 */
export class MySQLUserRepository implements IUserRepository {
  constructor(private pool: Pool) {}

  /**
   * Найти пользователя по email.
   */
  async findByEmail(email: string): Promise<{
    id: number;
    email: string;
    password_hash: string;
    role: string;
  } | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT id, email, password_hash, role FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    return rows.length
      ? {
          id: rows[0].id as number,
          email: rows[0].email as string,
          password_hash: rows[0].password_hash as string,
          role: rows[0].role as string,
        }
      : null;
  }

  /**
   * Создать нового пользователя.
   */
  async createUser(data: {
    email: string;
    password_hash: string;
    role?: string;
  }): Promise<{ id: number }> {
    const [result] = await this.pool.execute<import('mysql2/promise').ResultSetHeader>(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      [data.email, data.password_hash, data.role ?? 'admin']
    );
    return { id: result.insertId };
  }

  /**
   * Обновить пароль пользователя.
   */
  async updatePassword(id: number, password_hash: string): Promise<void> {
    await this.pool.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [password_hash, id]
    );
  }

  /**
   * Первый (по id) администратор — см. комментарий в интерфейсе.
   */
  async findFirstAdmin(): Promise<{
    id: number;
    email: string;
    password_hash: string;
    secret_word_hash: string | null;
    role: string;
  } | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT id, email, password_hash, secret_word_hash, role FROM users ORDER BY id ASC LIMIT 1'
    );
    return rows.length
      ? {
          id: rows[0].id as number,
          email: rows[0].email as string,
          password_hash: rows[0].password_hash as string,
          secret_word_hash: (rows[0].secret_word_hash as string | null) ?? null,
          role: rows[0].role as string,
        }
      : null;
  }

  /**
   * Задать/сменить/снять секретное слово для восстановления пароля.
   */
  async updateSecretWord(id: number, secret_word_hash: string | null): Promise<void> {
    await this.pool.execute(
      'UPDATE users SET secret_word_hash = ?, updated_at = NOW() WHERE id = ?',
      [secret_word_hash, id]
    );
  }
}