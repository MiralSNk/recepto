import 'server-only';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { IUnansweredQueryRepository } from '@/db/repositories/unanswered-query.repository';
import type { UnansweredQuery } from '@/types';

interface UnansweredQueryRow extends RowDataPacket {
  id: number;
  query_text: string;
  answer: string | null;
  answered_at: string | null;
  count: number;
  last_asked_at: string;
  created_at: string;
}

/**
 * Репозиторий неотвеченных запросов ИИ (MySQL).
 * Поддерживает сохранение ответа администратора.
 */
export class MySQLUnansweredQueryRepository implements IUnansweredQueryRepository {
  constructor(private pool: Pool) {}

  /**
   * Получить все неотвеченные запросы (сортировка по count убыванию).
   */
  async getUnansweredQueries(): Promise<UnansweredQuery[]> {
    const [rows] = await this.pool.query<UnansweredQueryRow[]>(
      `SELECT id, query_text, answer, answered_at, count, last_asked_at, created_at
       FROM chat_unanswered_queries
       ORDER BY (answer IS NULL) DESC, count DESC, last_asked_at DESC`
    );
    return rows.map(mapRow);
  }

  async findAnswer(queryText: string): Promise<string | null> {
    const text = queryText.trim().slice(0, 500);
    if (!text) return null;
    const [rows] = await this.pool.query<UnansweredQueryRow[]>(
      `SELECT answer FROM chat_unanswered_queries
       WHERE answer IS NOT NULL AND LOWER(query_text) = LOWER(?)
       LIMIT 1`,
      [text]
    );
    return rows[0]?.answer ?? null;
  }

  /**
   * Добавить или увеличить счётчик неотвеченного запроса.
   */
  async upsertUnansweredQuery(queryText: string): Promise<void> {
    await this.pool.execute(
      `INSERT INTO chat_unanswered_queries (query_text)
       VALUES (?)
       ON DUPLICATE KEY UPDATE count = count + 1, last_asked_at = NOW()`,
      [queryText]
    );
  }

  async setAnswer(id: number, answer: string): Promise<void> {
    await this.pool.execute(
      `UPDATE chat_unanswered_queries
       SET answer = ?, answered_at = NOW()
       WHERE id = ?`,
      [answer.trim(), id]
    );
  }

  async clearAnswer(id: number): Promise<void> {
    await this.pool.execute(
      `UPDATE chat_unanswered_queries
       SET answer = NULL, answered_at = NULL
       WHERE id = ?`,
      [id]
    );
  }

  /**
   * Удалить неотвеченный запрос по id.
   */
  async deleteUnansweredQuery(id: number): Promise<void> {
    await this.pool.execute('DELETE FROM chat_unanswered_queries WHERE id = ?', [id]);
  }
}

function mapRow(row: UnansweredQueryRow): UnansweredQuery {
  return {
    id: row.id,
    query_text: row.query_text,
    answer: row.answer ?? null,
    answered_at: row.answered_at ?? null,
    count: row.count,
    last_asked_at: row.last_asked_at,
    created_at: row.created_at,
  };
}