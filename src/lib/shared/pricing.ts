import { DEFAULT_FORMULA, evaluateFormula, parseFormula } from './formula';

// Единственное место, где эти два числа существуют как литералы — сервер
// (src/lib/server/pricing.ts DEFAULTS) и клиентский конструктор формулы
// (FormulaConstructor.tsx) импортируют их отсюда, а не переобъявляют, чтобы
// нельзя было забыть поправить одно место при смене дефолта.
export const DEFAULT_SECOND_GUEST_PRICE = 400;
export const DEFAULT_EXTRA_GUEST_PRICE = 800;

export interface PricingRulesInput {
  childFreeAgeLimit: number;
  secondGuestPrice: number;
  /** Доплата за 3-го и каждого следующего гостя. */
  extraGuestPrice: number;
}

export interface PriceInput {
  basePricePerNight: number;
  adults: number;
  childAges: number[];
  nights: number;
  rules: PricingRulesInput;
  /** Доп. тарифы с in_calculator=true — плоское значение каждого (карточка формулы). */
  additionalTariffs: { key: string; price: number }[];
  /** Строка формулы (site_settings.calculator_formula). */
  formula: string;
}

export interface PriceBreakdown {
  freeChildrenCount: number;
  /** Взрослые + дети от childFreeAgeLimit — считаются платящими гостями. */
  countedGuests: number;
  secondGuestSurcharge: number;
  /** Гости с 3-й позиции и далее. */
  extraGuestsCount: number;
  extraGuestsSurcharge: number;
  nights: number;
  /** Итоговая цена за бронь целиком — считается формулой один раз, "цена за
   *  одну ночь" отдельно не выделяется: для произвольной формулы (например,
   *  с разовым сбором, не умножаемым на число ночей) эта величина перестаёт
   *  быть однозначной. */
  total: number;
  /** Заполняется, только если сохранённая формула вдруг оказалась невалидна
   *  (не должно происходить — сервер валидирует перед сохранением, но
   *  парсим defensively на случай гонки/устаревшего кэша) — в этом случае
   *  используется DEFAULT_FORMULA, чтобы форма бронирования не падала. */
  formulaError?: string;
}

/**
 * Позиционный расчёт доплат за гостей: 1-й гость включён в базовую цену
 * номера, 2-й — доплата secondGuestPrice, 3-й и каждый следующий — доплата
 * extraGuestPrice за каждого. Дети младше childFreeAgeLimit бесплатны и не
 * считаются гостем; дети childFreeAgeLimit+ — платящий гость наравне со
 * взрослым. Результат — уже готовые значения карточек second_guest/extra_guest
 * формулы (формула их не пересчитывает, а только складывает/умножает).
 */
export function calculatePrice({
  basePricePerNight,
  adults,
  childAges,
  nights,
  rules,
  additionalTariffs,
  formula,
}: PriceInput): PriceBreakdown {
  // Number.isFinite() — не просто age < limit: для NaN/некорректного значения
  // (untrusted источник, childAges типизирован как number[], но рантайм это
  // не гарантирует) оба сравнения "age < limit" и "age >= limit" дают false,
  // и запись бесследно исчезает из обоих вёдер. Некорректный возраст считаем
  // платящим гостем (безопасный дефолт — не даём гостю стать невидимым и
  // бесплатным по ошибке).
  const freeChildren = childAges.filter(
    (age) => Number.isFinite(age) && age < rules.childFreeAgeLimit
  );
  const payingChildren = childAges.filter(
    (age) => !Number.isFinite(age) || age >= rules.childFreeAgeLimit
  );

  const countedGuests = Math.max(1, adults + payingChildren.length);
  const secondGuestSurcharge = countedGuests >= 2 ? rules.secondGuestPrice : 0;
  const extraGuestsCount = Math.max(0, countedGuests - 2);
  const extraGuestsSurcharge = extraGuestsCount * rules.extraGuestPrice;

  const cardValues: Record<string, number> = {
    base: basePricePerNight,
    days: nights,
    second_guest: secondGuestSurcharge,
    extra_guest: extraGuestsSurcharge,
  };
  for (const tariff of additionalTariffs) {
    cardValues[tariff.key] = tariff.price;
  }

  const knownCardKeys = Object.keys(cardValues);
  let parsed = parseFormula(formula, knownCardKeys);
  let formulaError: string | undefined;
  if ('error' in parsed) {
    formulaError = parsed.error;
    // DEFAULT_FORMULA использует только base/days/second_guest/extra_guest —
    // всегда валиден относительно cardValues, объявленных выше.
    parsed = parseFormula(DEFAULT_FORMULA, knownCardKeys) as { ast: import('./formula').FormulaNode };
  }

  const total = evaluateFormula(parsed.ast, cardValues);

  return {
    freeChildrenCount: freeChildren.length,
    countedGuests,
    secondGuestSurcharge,
    extraGuestsCount,
    extraGuestsSurcharge,
    nights,
    total,
    ...(formulaError ? { formulaError } : {}),
  };
}
