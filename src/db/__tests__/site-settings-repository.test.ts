import { describe, it, expect, vi } from 'vitest';
import { MySQLSiteSettingsRepository } from '../mysql/repositories/site-settings-repository';
import type { Pool } from 'mysql2/promise';

describe('MySQLSiteSettingsRepository', () => {
  // site_settings.value — колонка типа MySQL JSON. mysql2 сам десериализует
  // её в нативный JS-тип (объект остаётся объектом, строка — строкой), а НЕ
  // отдаёт сырую JSON-строку — моки здесь имитируют именно это. Раньше тесты
  // ошибочно мокали pool.query как будто он возвращает JSON-текст, и код
  // делал JSON.parse ПОВЕРХ уже распарсенного значения — для строк вроде
  // "Отель" это валидный JS-string, но невалидный JSON, JSON.parse кидал
  // SyntaxError, тихо ловился в catch, и настройка читалась как null (реальный
  // баг в проде: hero/logo/SEO-тексты и палитра переставали читаться).
  it('getSetting возвращает значение как есть (уже распарсено mysql2)', async () => {
    const pool = {
      query: vi.fn().mockResolvedValueOnce([[{ value: { key: 'value' } }]]),
    } as unknown as Pool;

    const repo = new MySQLSiteSettingsRepository(pool);
    const setting = await repo.getSetting('palette');

    expect(setting).toEqual({ key: 'value' });
  });

  it('getSetting корректно возвращает строковое значение (не ломается на невалидном для JSON.parse тексте)', async () => {
    const pool = {
      query: vi.fn().mockResolvedValueOnce([[{ value: '/hero-bg.png' }]]),
    } as unknown as Pool;

    const repo = new MySQLSiteSettingsRepository(pool);
    const setting = await repo.getSetting('hero_bg');

    expect(setting).toBe('/hero-bg.png');
  });

  it('getSettings делает один запрос вместо N', async () => {
    const pool = {
      query: vi.fn().mockResolvedValueOnce([
        [
          { setting_key: 'hotel_name', value: 'Отель' },
          { setting_key: 'hotel_phone', value: '+7' },
        ],
      ]),
    } as unknown as Pool;

    const repo = new MySQLSiteSettingsRepository(pool);
    const settings = await repo.getSettings(['hotel_name', 'hotel_phone', 'hotel_email']);

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(settings).toEqual({ hotel_name: 'Отель', hotel_phone: '+7' });
  });

  it('getSettings с пустым списком не делает запрос', async () => {
    const pool = { query: vi.fn() } as unknown as Pool;
    const repo = new MySQLSiteSettingsRepository(pool);
    expect(await repo.getSettings([])).toEqual({});
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('setSetting сериализует JSON', async () => {
    const pool = {
      execute: vi.fn().mockResolvedValue([{}]),
    } as unknown as Pool;

    const repo = new MySQLSiteSettingsRepository(pool);
    await repo.setSetting('palette', { key: 'value' });

    expect(pool.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO site_settings'),
      ['palette', '{"key":"value"}']
    );
  });
});