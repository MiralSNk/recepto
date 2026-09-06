import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RoomCard from './RoomCard';
import type { Room } from '@/types';

vi.mock('@/components/BookingForm/BookingFormProvider', () => ({
  useBookingForm: () => ({ openBooking: vi.fn() }),
}));

const baseRoom: Room = {
  id: 7,
  name: '№-7, Комфорт',
  category: 'comfort',
  categoryMaxGuests: null,
  price: 6000,
  price_day: 3690,
  area: null,
  guests: 2,
  extraGuestCapacity: 0,
  description: 'Уютный номер',
  fullDescription: 'Полное описание',
  amenities: [],
  extras: [],
  images: [],
  roomTariffs: [],
};

describe('RoomCard', () => {
  // price и price_day — два умышленно независимых поля (заказчик подтвердил,
  // что это функциональность, а не рассинхрон): карточка на главной
  // показывает price, страница номера/форма бронирования/ИИ-помощник — свой
  // price_day. Значения в baseRoom разные (6000 vs 3690) специально, чтобы
  // тест ловил регрессию, если карточка вдруг снова начнёт читать price_day.
  it('показывает price, а не price_day', () => {
    render(<RoomCard room={baseRoom} searchParams={new URLSearchParams()} />);
    expect(screen.getByText(/6\s*000/)).toBeInTheDocument();
    expect(screen.queryByText(/3\s*690/)).not.toBeInTheDocument();
  });
});
