import { describe, it, expect, vi } from 'vitest';

vi.mock('../seo', () => ({
  getSiteSettings: vi.fn(),
}));
vi.mock('../amenities-db', () => ({
  getAllAmenities: vi.fn(),
}));
vi.mock('../categories-db', () => ({
  getVisibleCategories: vi.fn(),
}));
vi.mock('../rooms-db', () => ({
  getAllRooms: vi.fn(),
}));
vi.mock('../tariffs-db', () => ({
  getAllTariffs: vi.fn(),
}));

import { getSiteSettings } from '../seo';
import { getAllAmenities } from '../amenities-db';
import { getVisibleCategories } from '../categories-db';
import { getAllRooms } from '../rooms-db';
import { getAllTariffs } from '../tariffs-db';
import { buildRoomsContext } from '../chat-rooms-context';

const BUILTIN_TARIFFS = [
  { id: 1, tariff_key: 'second_guest', label: 'Доплата за 2-го гостя', price: 400, is_builtin: true, in_calculator: true, sort_order: 10 },
  { id: 2, tariff_key: 'extra_guest', label: 'Доплата за 3-го и каждого следующего гостя', price: 800, is_builtin: true, in_calculator: true, sort_order: 20 },
];

const PET_DEPOSIT_TARIFF = {
  id: 3,
  tariff_key: 'pet_deposit',
  label: 'Депозит за животных',
  price: 777,
  is_builtin: false,
  in_calculator: true,
  sort_order: 30,
};

function baseMocks(formula: string) {
  vi.mocked(getSiteSettings).mockResolvedValue({
    hotel_name: 'Тестовый отель',
    child_free_age_limit: '7',
    max_guests_absolute: '10',
    calculator_formula: formula,
  } as any);
  vi.mocked(getAllAmenities).mockResolvedValue([]);
  vi.mocked(getVisibleCategories).mockResolvedValue([
    { key: 'standard', label: 'Стандарт' },
  ] as any);
  vi.mocked(getAllTariffs).mockResolvedValue([...BUILTIN_TARIFFS, PET_DEPOSIT_TARIFF] as any);
  vi.mocked(getAllRooms).mockResolvedValue([
    {
      id: 1,
      name: 'Люкс',
      category: 'standard',
      price_day: 3000,
      area: 25,
      guests: 2,
      extraGuestCapacity: 1,
      description: 'Просторный номер',
      fullDescription: 'Просторный номер с видом на море',
      amenities: [],
      extras: ['Завтрак включён'],
      images: [],
      roomTariffs: [
        {
          tariff_id: 1,
          tariff_key: 'second_guest',
          label: 'Доплата за 2-го гостя',
          custom_label: 'МОЙ КАСТОМНЫЙ ТЕКСТ ДЛЯ ЭТОГО НОМЕРА',
          price: 400,
        },
      ],
    },
  ] as any);
}

describe('buildRoomsContext', () => {
  it('использует ЖИВОЙ custom_label и живую цену привязки тарифа к номеру, а не каталожный label', async () => {
    baseMocks('base + second_guest');

    const ctx = await buildRoomsContext();

    expect(ctx).toContain('МОЙ КАСТОМНЫЙ ТЕКСТ ДЛЯ ЭТОГО НОМЕРА: 400 ₽');
    // Каталожный label НЕ должен быть использован вместо custom_label.
    expect(ctx).not.toContain('Доплата за 2-го гостя: 400 ₽');
  });

  // ИИ не показываем формулу как алгебру (её ненадёжно читает модель в
  // диалоге) — вместо этого прямым текстом говорим, домножается ли каждая
  // доплата на число ночей или взимается разово. Это определяется живым
  // разбором calculator_formula (isCardScaledBy), поэтому не может отстать
  // от реальной настройки: формула без "* days" — доплата "разово".
  it('доплата, не умножаемая в формуле на days, описывается ИИ как разовая, а не "за ночь"', async () => {
    baseMocks('base + second_guest');

    const ctx = await buildRoomsContext();

    expect(ctx).toContain('2-й гость — доплата 400 ₽, разово за весь срок проживания.');
    expect(ctx).not.toContain('2-й гость — доплата 400 ₽, за ночь.');
  });

  it('доп. тариф, включённый в формулу и умножаемый на days, описывается как "за ночь"; отсутствующий в формуле — не упоминается', async () => {
    baseMocks('(base + second_guest + extra_guest) * days');

    const ctx = await buildRoomsContext();

    expect(ctx).toContain('2-й гость — доплата 400 ₽, за ночь.');
    expect(ctx).toContain('3-й и каждый следующий гость — доплата 800 ₽ за каждого, за ночь.');
    // pet_deposit помечен in_calculator=true в моке, но в САМОЙ формуле его
    // нет — ИИ не должен упоминать тариф, которого реально нет в расчёте.
    expect(ctx).not.toContain('Депозит за животных');
  });

  it('смена формулы между вызовами меняет и наличие, и "за ночь/разово" доп. тарифа (не закэшировано)', async () => {
    baseMocks('(base + second_guest + extra_guest) * days');
    const ctxDefault = await buildRoomsContext();
    expect(ctxDefault).not.toContain('Депозит за животных');

    baseMocks('base - pet_deposit');
    const ctxChanged = await buildRoomsContext();
    expect(ctxChanged).toContain('Депозит за животных — 777 ₽, разово за весь срок проживания.');
    expect(ctxChanged).not.toContain(ctxDefault);
  });
});
