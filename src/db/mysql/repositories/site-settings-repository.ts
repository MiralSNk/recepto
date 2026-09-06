import 'server-only';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { ISiteSettingsRepository } from '@/db/repositories/site-settings.repository';

interface SettingRow extends RowDataPacket {
  // Колонка site_settings.value имеет тип MySQL JSON — mysql2 сам
  // десериализует её в нативный JS-тип (строка остаётся строкой, объект —
  // объектом и т.д.), это НЕ сырая JSON-строка. Раньше здесь ещё раз
  // вызывался JSON.parse() поверх уже распарсенного значения — для любой
  // обычной строки (например, hero_bg = "/hero-bg.png") это валидный JS-
  // string, но НЕ валидный JSON-текст сам по себе, JSON.parse на нём кидал
  // SyntaxError, тихо ловился в catch и настройка читалась как null.
  // Из-за этого молча ломалось почти всё: hero/logo/SEO-тексты, палитра
  // (сохранение проходило, но перечитать её после — никогда).
  value: unknown;
}

/**
 * Реализация репозитория глобальных настроек сайта для MySQL.
 */
export class MySQLSiteSettingsRepository implements ISiteSettingsRepository {
  constructor(private pool: Pool) {}

  /**
   * Получить значение настройки (уже распарсенный mysql2 JSON-тип).
   */
  async getSetting(key: string): Promise<any | null> {
    const [rows] = await this.pool.query<SettingRow[]>(
      'SELECT value FROM site_settings WHERE setting_key = ? LIMIT 1',
      [key]
    );
    if (!rows.length) return null;
    return rows[0].value;
  }

  /**
   * Получить несколько настроек одним запросом вместо N отдельных SELECT.
   */
  async getSettings(keys: string[]): Promise<Record<string, any>> {
    if (keys.length === 0) return {};
    const placeholders = keys.map(() => '?').join(',');
    const [rows] = await this.pool.query<(SettingRow & { setting_key: string })[]>(
      `SELECT setting_key, value FROM site_settings WHERE setting_key IN (${placeholders})`,
      keys
    );
    const result: Record<string, any> = {};
    for (const row of rows) {
      result[row.setting_key] = row.value;
    }
    return result;
  }

  /**
   * Установить значение настройки (создать или обновить).
   */
  async setSetting(key: string, value: any): Promise<void> {
    await this.pool.execute(
      `INSERT INTO site_settings (setting_key, value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
      [key, JSON.stringify(value)]
    );
  }
}