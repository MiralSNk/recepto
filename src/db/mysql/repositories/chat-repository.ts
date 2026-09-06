import 'server-only';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { IChatRepository } from '@/db/repositories/chat.repository';

interface QuickReplyRow extends RowDataPacket {
  id: number;
  label: string;
  action: string;
  sort_order: number;
}

/**
 * Реализация репозитория чат-бота (настройки и быстрые кнопки) для MySQL.
 */
export class MySQLChatRepository implements IChatRepository {
  constructor(private pool: Pool) {}

  /**
   * Получить текстовую настройку по ключу.
   */
  async getSetting(key: string): Promise<string | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT value FROM chat_settings WHERE setting_key = ? LIMIT 1',
      [key]
    );
    return rows.length ? rows[0].value : null;
  }

  /**
   * Записать текстовую настройку (создать или обновить).
   */
  async setSetting(key: string, value: string): Promise<void> {
    await this.pool.execute(
      `INSERT INTO chat_settings (setting_key, value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
      [key, value]
    );
  }

  /**
   * Получить видимые быстрые кнопки (сортировка по sort_order).
   */
  async getQuickReplies(): Promise<
    { id: number; label: string; action: string; sort_order: number }[]
  > {
    const [rows] = await this.pool.query<QuickReplyRow[]>(
      'SELECT id, label, action, sort_order FROM chat_quick_replies WHERE is_visible = TRUE ORDER BY sort_order, id'
    );
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      action: row.action,
      sort_order: row.sort_order,
    }));
  }

  /**
   * Создать новую быструю кнопку.
   */
  async createQuickReply(data: {
    label: string;
    action: string;
    sort_order?: number;
    is_visible?: boolean;
  }): Promise<{ id: number }> {
    const [result] = await this.pool.execute<import('mysql2/promise').ResultSetHeader>(
      'INSERT INTO chat_quick_replies (label, action, sort_order, is_visible) VALUES (?, ?, ?, ?)',
      [data.label, data.action, data.sort_order ?? 0, data.is_visible ?? true]
    );
    return { id: result.insertId };
  }

  /**
   * Обновить быструю кнопку по id.
   */
  async updateQuickReply(
    id: number,
    data: Partial<{
      label: string;
      action: string;
      sort_order: number;
      is_visible: boolean;
    }>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.label !== undefined) { fields.push('label = ?'); values.push(data.label); }
    if (data.action !== undefined) { fields.push('action = ?'); values.push(data.action); }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
    if (data.is_visible !== undefined) { fields.push('is_visible = ?'); values.push(data.is_visible); }

    if (fields.length) {
      fields.push('updated_at = NOW()');
      values.push(id);
      await this.pool.execute(
        `UPDATE chat_quick_replies SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  }

  /**
   * Удалить быструю кнопку по id.
   */
  async deleteQuickReply(id: number): Promise<void> {
    await this.pool.execute('DELETE FROM chat_quick_replies WHERE id = ?', [id]);
  }
}