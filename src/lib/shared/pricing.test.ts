import { describe, it, expect } from 'vitest';
import { calculatePrice } from './pricing';
import { DEFAULT_FORMULA } from './formula';

const rules = {
  childFreeAgeLimit: 7,
  secondGuestPrice: 400,
  extraGuestPrice: 800,
};

const base = {
  nights: 1,
  rules,
  additionalTariffs: [] as { key: string; price: number }[],
  formula: DEFAULT_FORMULA,
};

describe('calculatePrice — дефолтная формула (base + second_guest + extra_guest) * days', () => {
  it('один взрослый, одна ночь — без доплат', () => {
    const result = calculatePrice({ ...base, basePricePerNight: 3000, adults: 1, childAges: [] });
    expect(result.countedGuests).toBe(1);
    expect(result.total).toBe(3000);
  });

  it('два взрослых — доплата за 2-го гостя', () => {
    const result = calculatePrice({ ...base, basePricePerNight: 3000, adults: 2, childAges: [] });
    expect(result.secondGuestSurcharge).toBe(400);
    expect(result.extraGuestsCount).toBe(0);
    expect(result.total).toBe(3400);
  });

  it('ребёнок младше порога — бесплатен, гостем не считается', () => {
    const result = calculatePrice({ ...base, basePricePerNight: 3000, adults: 1, childAges: [5] });
    expect(result.freeChildrenCount).toBe(1);
    expect(result.countedGuests).toBe(1);
    expect(result.total).toBe(3000);
  });

  it('ребёнок от порога считается платящим гостем наравне со взрослым', () => {
    const result = calculatePrice({ ...base, basePricePerNight: 3000, adults: 1, childAges: [10] });
    expect(result.countedGuests).toBe(2);
    expect(result.secondGuestSurcharge).toBe(400);
    expect(result.total).toBe(3400);
  });

  it('пример заказчика: 3 гостя + ребёнок 11 лет + ребёнок 5 лет → X+400+800+800+0', () => {
    const result = calculatePrice({ ...base, basePricePerNight: 3000, adults: 3, childAges: [11, 5] });
    expect(result.freeChildrenCount).toBe(1); // ребёнок 5 лет
    expect(result.countedGuests).toBe(4); // 3 взрослых + ребёнок 11 лет
    expect(result.secondGuestSurcharge).toBe(400);
    expect(result.extraGuestsCount).toBe(2); // 3-й и 4-й гости
    expect(result.extraGuestsSurcharge).toBe(1600); // 800 + 800
    expect(result.total).toBe(3000 + 400 + 800 + 800);
  });

  it('пятеро платящих гостей — доплата за 3-го, 4-го и 5-го', () => {
    const result = calculatePrice({ ...base, basePricePerNight: 3000, adults: 5, childAges: [] });
    expect(result.extraGuestsCount).toBe(3);
    expect(result.extraGuestsSurcharge).toBe(2400);
    expect(result.total).toBe(3000 + 400 + 2400);
  });

  it('вместимость номера в расчёт не входит — доплата чисто позиционная', () => {
    const result = calculatePrice({ ...base, basePricePerNight: 3000, adults: 6, childAges: [] });
    expect(result.countedGuests).toBe(6);
    expect(result.extraGuestsCount).toBe(4);
  });

  it('итог умножается на число ночей целиком', () => {
    const result = calculatePrice({ ...base, basePricePerNight: 3000, adults: 2, childAges: [], nights: 3 });
    expect(result.total).toBe((3000 + 400) * 3);
    expect(result.nights).toBe(3);
  });
});

describe('calculatePrice — произвольная формула с доп. тарифом', () => {
  it('доп. тариф, включённый в формулу, добавляется к итогу', () => {
    const result = calculatePrice({
      ...base,
      basePricePerNight: 3000,
      adults: 1,
      childAges: [],
      additionalTariffs: [{ key: 'pet_deposit', price: 800 }],
      formula: 'base + pet_deposit',
    });
    expect(result.total).toBe(3800);
  });

  it('разовый сбор вне умножения на дни не домножается на число ночей', () => {
    const result = calculatePrice({
      ...base,
      basePricePerNight: 3000,
      adults: 1,
      childAges: [],
      nights: 3,
      additionalTariffs: [{ key: 'cleaning', price: 500 }],
      formula: '(base * days) + cleaning',
    });
    expect(result.total).toBe(3000 * 3 + 500);
  });

  it('невалидная формула — фолбэк на DEFAULT_FORMULA с пометкой formulaError', () => {
    const result = calculatePrice({
      ...base,
      basePricePerNight: 3000,
      adults: 2,
      childAges: [],
      formula: 'base + unknown_card',
    });
    expect(result.formulaError).toBeTruthy();
    expect(result.total).toBe(3400); // как дефолтная формула для 2 гостей
  });
});
