import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RoomDetailContent from './RoomDetailContent';
import type { Room } from '@/types';

vi.mock('@/components/BookingForm/BookingFormProvider', () => ({
  useBookingForm: () => ({ openBooking: vi.fn() }),
}));

const baseRoom: Room = {
  id: 1,
  name: 'Семейный номер',
  category: 'comfort',
  categoryMaxGuests: null,
  price: 5000,
  price_day: 5000,
  area: 30,
  guests: 2,
  extraGuestCapacity: 2,
  description: 'Краткое описание',
  fullDescription: 'Полное описание',
  amenities: [],
  extras: [],
  images: [],
  roomTariffs: [],
};

describe('RoomDetailContent', () => {
  it('показывает дефолтные заголовок вместимости и пояснение о цене, если пропсы не заданы', () => {
    render(<RoomDetailContent room={baseRoom} />);
    expect(screen.getByText('Допустимое размещение')).toBeInTheDocument();
    expect(screen.getByText('Цена указана за проживание без доп. мест.')).toBeInTheDocument();
  });

  it('заголовок вместимости стоит перед строкой «• N гость + M доп. место»', () => {
    render(<RoomDetailContent room={baseRoom} />);
    const heading = screen.getByText('Допустимое размещение');
    const capacityLine = screen.getByText(/доп\. место/);
    expect(
      heading.compareDocumentPosition(capacityLine) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('использует переданные из админки заголовок и пояснение вместо дефолтных', () => {
    render(
      <RoomDetailContent
        room={baseRoom}
        capacityHeading="Вместимость номера"
        priceNote="Своё пояснение о доп. местах"
      />
    );
    expect(screen.getByText('Вместимость номера')).toBeInTheDocument();
    expect(screen.getByText('Своё пояснение о доп. местах')).toBeInTheDocument();
    expect(screen.queryByText('Допустимое размещение')).not.toBeInTheDocument();
  });

  it('пояснение о цене показывается и без доп. мест у номера (новая тарифная модель)', () => {
    render(<RoomDetailContent room={{ ...baseRoom, extraGuestCapacity: 0 }} />);
    expect(screen.getByText('Цена указана за проживание без доп. мест.')).toBeInTheDocument();
  });

  it('падает на дефолты и при пустой строке в пропсах (getSiteSettings отдаёт "" для незаполненного ключа)', () => {
    render(<RoomDetailContent room={baseRoom} capacityHeading="" priceNote="" />);
    expect(screen.getByText('Допустимое размещение')).toBeInTheDocument();
    expect(screen.getByText('Цена указана за проживание без доп. мест.')).toBeInTheDocument();
  });

  it('ничего не рендерит про вместимость, если у номера не задано число гостей', () => {
    render(<RoomDetailContent room={{ ...baseRoom, guests: null }} />);
    expect(screen.queryByText('Допустимое размещение')).not.toBeInTheDocument();
    expect(screen.queryByText('Цена указана за проживание без доп. мест.')).not.toBeInTheDocument();
  });

  // Тарифы показываются в том же визуальном списке "Дополнительно", что и
  // свободный текст (&__extras) — название и цена одной строкой, без
  // отдельного бокса с ценой.
  it('показывает привязанные тарифы с per-room custom_label и живой ценой из каталога, в списке «Дополнительно»', () => {
    render(
      <RoomDetailContent
        room={{
          ...baseRoom,
          roomTariffs: [
            { tariff_id: 1, tariff_key: 'second_guest', label: 'Доплата за 2-го гостя', custom_label: 'Стоимость размещения 2-го гостя', price: 400 },
          ],
        }}
      />
    );
    expect(screen.getByText('Дополнительно')).toBeInTheDocument();
    expect(screen.getByText(/Стоимость размещения 2-го гостя\s*400\s*₽/)).toBeInTheDocument();
  });

  it('падает на каталожный label, если custom_label пуст', () => {
    render(
      <RoomDetailContent
        room={{
          ...baseRoom,
          roomTariffs: [
            { tariff_id: 1, tariff_key: 'second_guest', label: 'Доплата за 2-го гостя', custom_label: '', price: 400 },
          ],
        }}
      />
    );
    expect(screen.getByText(/Доплата за 2-го гостя\s*400\s*₽/)).toBeInTheDocument();
  });

  it('тарифы и свободные доп. услуги попадают в один список', () => {
    render(
      <RoomDetailContent
        room={{
          ...baseRoom,
          roomTariffs: [
            { tariff_id: 1, tariff_key: 'breakfast', label: 'Завтрак', custom_label: 'Стоимость завтрака', price: 750 },
          ],
          extras: ['При проживании с животными вносится депозит'],
        }}
      />
    );
    expect(screen.getByText(/Стоимость завтрака\s*750\s*₽/)).toBeInTheDocument();
    expect(screen.getByText('При проживании с животными вносится депозит')).toBeInTheDocument();
  });

  it('ничего не рендерит про «Дополнительно», если и тарифы, и extras пусты', () => {
    render(<RoomDetailContent room={baseRoom} />);
    expect(screen.queryByText('Дополнительно')).not.toBeInTheDocument();
  });
});
