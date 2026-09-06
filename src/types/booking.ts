/**
 * Заявка на бронирование (таблица bookings).
 */
export type BookingStatus = 'new' | 'processed' | 'confirmed' | 'cancelled';

export interface Booking {
  id: number;
  room_id: number | null;
  name: string;
  phone: string;
  email: string | null;
  check_in: string | null;
  check_out: string | null;
  adults: number;
  children: number;
  comment: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}