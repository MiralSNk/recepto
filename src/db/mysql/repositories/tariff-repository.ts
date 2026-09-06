import 'server-only';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { ITariffRepository } from '@/db/repositories/tariff.repository';
import type { Tariff } from '@/types';

interface TariffRow extends RowDataPacket {
  id: number;
  tariff_key: string;
  label: string;
  price: number;
  is_builtin: number | boolean;
  in_calculator: number | boolean;
  sort_order: number;
}

function mapTariffRow(row: TariffRow): Tariff {
  return {
    id: row.id,
    tariff_key: row.tariff_key,
    label: row.label,
    price: row.price,
    is_builtin: Boolean(row.is_builtin),
    in_calculator: Boolean(row.in_calculator),
    sort_order: row.sort_order,
  };
}

const SELECT_COLUMNS = 'id, tariff_key, label, price, is_builtin, in_calculator, sort_order';

/**
 * Реализация репозитория тарифов для MySQL.
 */
export class MySQLTariffRepository implements ITariffRepository {
  constructor(private pool: Pool) {}

  async getAllTariffs(): Promise<Tariff[]> {
    const [rows] = await this.pool.query<TariffRow[]>(
      `SELECT ${SELECT_COLUMNS} FROM tariffs ORDER BY sort_order, id`
    );
    return rows.map(mapTariffRow);
  }

  async getTariffById(id: number): Promise<Tariff | null> {
    const [rows] = await this.pool.query<TariffRow[]>(
      `SELECT ${SELECT_COLUMNS} FROM tariffs WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows.length ? mapTariffRow(rows[0]) : null;
  }

  async getTariffByKey(key: string): Promise<Tariff | null> {
    const [rows] = await this.pool.query<TariffRow[]>(
      `SELECT ${SELECT_COLUMNS} FROM tariffs WHERE tariff_key = ? LIMIT 1`,
      [key]
    );
    return rows.length ? mapTariffRow(rows[0]) : null;
  }

  async createTariff(data: {
    tariff_key: string;
    label: string;
    price?: number;
    is_builtin?: boolean;
    in_calculator?: boolean;
    sort_order?: number;
  }): Promise<{ id: number }> {
    const [result] = await this.pool.execute<import('mysql2/promise').ResultSetHeader>(
      'INSERT INTO tariffs (tariff_key, label, price, is_builtin, in_calculator, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [
        data.tariff_key,
        data.label,
        data.price ?? 0,
        data.is_builtin ?? false,
        data.in_calculator ?? false,
        data.sort_order ?? 0,
      ]
    );
    return { id: result.insertId };
  }

  async updateTariff(
    id: number,
    data: Partial<{
      label: string;
      price: number;
      in_calculator: boolean;
      sort_order: number;
    }>
  ): Promise<void> {
    const fields: string[] = [];
    const values: (string | number | boolean)[] = [];

    if (data.label !== undefined) { fields.push('label = ?'); values.push(data.label); }
    if (data.price !== undefined) { fields.push('price = ?'); values.push(data.price); }
    if (data.in_calculator !== undefined) { fields.push('in_calculator = ?'); values.push(data.in_calculator); }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }

    if (fields.length) {
      values.push(id);
      await this.pool.execute(`UPDATE tariffs SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  }

  async deleteTariff(id: number): Promise<void> {
    await this.pool.execute('DELETE FROM tariffs WHERE id = ?', [id]);
  }

  async countRoomTariffUsage(tariffId: number): Promise<number> {
    const [rows] = await this.pool.query<(RowDataPacket & { count: number })[]>(
      'SELECT COUNT(*) AS count FROM room_tariffs WHERE tariff_id = ?',
      [tariffId]
    );
    return rows[0]?.count ?? 0;
  }
}
