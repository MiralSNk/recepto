import 'server-only';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { IBookingRepository } from '@/db/repositories/booking.repository';

/**
 * Реализация репозитория бронирований для MySQL.
 */
export class MySQLBookingRepository implements IBookingRepository {
  constructor(private pool: Pool) {}

  /**
   * Создать новую заявку на бронирование.
   */
  async createBooking(data: {
    room_id?: number | null;
    name: string;
    phone: string;
    email?: string | null;
    check_in?: string | null;
    check_out?: string | null;
    adults?: number;
    children?: number;
    comment?: string | null;
  }): Promise<{ id: number }> {
    const [result] = await this.pool.execute<import('mysql2/promise').ResultSetHeader>(
      `INSERT INTO bookings (room_id, name, phone, email, check_in, check_out, adults, children, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.room_id ?? null,
        data.name,
        data.phone,
        data.email ?? null,
        data.check_in ?? null,
        data.check_out ?? null,
        data.adults ?? 1,
        data.children ?? 0,
        data.comment ?? null,
      ]
    );
    return { id: result.insertId };
  }

  /**
   * Получить заявку по id.
   */
  async getBookingById(id: number): Promise<RowDataPacket | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT * FROM bookings WHERE id = ?',
      [id]
    );
    return rows.length ? rows[0] : null;
  }

  /**
   * Обновить статус заявки.
   */
  async updateBookingStatus(id: number, status: string): Promise<void> {
    await this.pool.execute(
      'UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
  }

  /**
   * Получить список заявок с фильтрами.
   */
  async getBookings(filters?: {
    status?: string;
    from?: string;
    to?: string;
  }): Promise<RowDataPacket[]> {
    let sql = 'SELECT * FROM bookings WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.from) {
      sql += ' AND created_at >= ?';
      params.push(filters.from);
    }
    if (filters?.to) {
      sql += ' AND created_at <= ?';
      params.push(filters.to);
    }

    sql += ' ORDER BY created_at DESC';
    const [rows] = await this.pool.query<RowDataPacket[]>(sql, params);
    return rows;
  }
}