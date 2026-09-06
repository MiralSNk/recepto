export type BookingDraftFields = {
  name: string;
  phone: string;
  email: string;
  comment: string;
  checkIn: string;
  checkOut: string;
  adults: string;
  childAges: number[];
};

const KEY = 'recepto_booking_draft_v1';

export function loadBookingDraft(): Partial<BookingDraftFields> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<BookingDraftFields>;
  } catch {
    return null;
  }
}

export function saveBookingDraft(data: Partial<BookingDraftFields>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function clearBookingDraft() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}