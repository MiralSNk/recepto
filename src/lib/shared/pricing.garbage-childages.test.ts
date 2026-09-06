import { describe, it, expect } from 'vitest';
import { calculatePrice } from './pricing';
import { DEFAULT_FORMULA } from './formula';

// Регрессионный тест на "мусорные" значения в childAges (NaN / нечисловые
// записи). Раньше calculatePrice делил childAges на freeChildren/
// payingChildren без проверки Number.isFinite, и NaN бесследно исчезал из
// обоих вёдер (не платит как гость, но и не попадает в freeChildrenCount).
// Сейчас оба .filter() в pricing.ts проверяют Number.isFinite(age) и
// относят некорректный возраст к payingChildren (безопасный дефолт).
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

describe('calculatePrice — некорректный возраст в childAges не должен пропадать бесследно', () => {
  it('NaN-возраст ребёнка обязан быть учтён (бесплатным либо платящим), а не исчезать из обоих счётчиков', () => {
    const result = calculatePrice({
      ...base,
      basePricePerNight: 3000,
      adults: 1,
      childAges: [NaN],
    });

    // Инвариант: каждая запись childAges обязана попасть либо в
    // freeChildrenCount, либо увеличить countedGuests относительно
    // "0 детей". Сейчас же NaN не делает ни того, ни другого.
    const totalAccountedFor = result.freeChildrenCount + (result.countedGuests - 1 /* adults */);
    expect(totalAccountedFor).toBe(1);
  });

  it('нечисловая строка вместо возраста тоже обязана быть учтена, а не молча отфильтрована', () => {
    const result = calculatePrice({
      ...base,
      basePricePerNight: 3000,
      adults: 1,
      // childAges типизирован как number[], но рантайм не проверяет это —
      // ровно тот случай, который может прийти из непроверенного источника.
      childAges: ['abc' as unknown as number],
    });

    const totalAccountedFor = result.freeChildrenCount + (result.countedGuests - 1 /* adults */);
    expect(totalAccountedFor).toBe(1);
  });
});
