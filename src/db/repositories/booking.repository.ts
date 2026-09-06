/**
 * Репозиторий для работы с заявками на бронирование.
 */
export interface IBookingRepository {
  /**
   * Создать новую заявку.
   */
  createBooking(data: {
    room_id?: number | null;
    name: string;
    phone: string;
    email?: string | null;
    check_in?: string | null;
    check_out?: string | null;
    adults?: number;
    children?: number;
    comment?: string | null;
  }): Promise<{ id: number }>;

  /**
   * Получить заявку по id.
   */
  getBookingById(id: number): Promise<any | null>;

  /**
   * Обновить статус заявки.
   */
  updateBookingStatus(id: number, status: string): Promise<void>;

  /**
   * Получить список заявок с возможной фильтрацией по статусу и датам.
   */
  getBookings(filters?: {
    status?: string;
    from?: string;
    to?: string;
  }): Promise<any[]>;
}