import { describe, it, expect, vi } from 'vitest';

vi.mock('./seo', () => ({
  getSiteSettings: vi.fn(),
}));
vi.mock('./tariffs-db', () => ({
  getAllTariffs: vi.fn(),
}));

import { getSiteSettings } from './seo';
import { getAllTariffs } from './tariffs-db';
import { getPricingRules } from './pricing';
import { DEFAULT_FORMULA } from '@/lib/shared/formula';

const BUILTIN_TARIFFS = (second: number, extra: number) => [
  { id: 1, tariff_key: 'second_guest', label: 'Доплата за 2-го гостя', price: second, is_builtin: true, in_calculator: true, sort_order: 10 },
  { id: 2, tariff_key: 'extra_guest', label: 'Доплата за 3-го и каждого следующего гостя', price: extra, is_builtin: true, in_calculator: true, sort_order: 20 },
];

describe('getPricingRules', () => {
  // Регрессия: Number('') === 0 в JS. Пустая (ещё не заполненная в админке)
  // настройка молча превращалась в 0 (0 макс. гостей — форма брони и
  // GuestSelector блокировались) вместо дефолта.
  it('незаполненные (пустые строки) настройки берут дефолты, а не 0', async () => {
    vi.mocked(getSiteSettings).mockResolvedValue({
      child_free_age_limit: '',
      max_guests_absolute: '',
      calculator_formula: '',
    } as any);
    vi.mocked(getAllTariffs).mockResolvedValue([]);

    const rules = await getPricingRules();

    expect(rules.childFreeAgeLimit).toBe(7);
    expect(rules.secondGuestPrice).toBe(400);
    expect(rules.extraGuestPrice).toBe(800);
    expect(rules.maxGuestsAbsolute).toBe(10);
    expect(rules.formula).toBe(DEFAULT_FORMULA);
    expect(rules.additionalTariffs).toEqual([]);
  });

  it('явно заданные значения используются как есть', async () => {
    vi.mocked(getSiteSettings).mockResolvedValue({
      child_free_age_limit: '5',
      max_guests_absolute: '8',
      calculator_formula: 'base + second_guest',
    } as any);
    vi.mocked(getAllTariffs).mockResolvedValue(BUILTIN_TARIFFS(300, 600) as any);

    const rules = await getPricingRules();

    expect(rules.childFreeAgeLimit).toBe(5);
    expect(rules.secondGuestPrice).toBe(300);
    expect(rules.extraGuestPrice).toBe(600);
    expect(rules.maxGuestsAbsolute).toBe(8);
    expect(rules.formula).toBe('base + second_guest');
  });

  it('явный 0 (реальное намерение) не подменяется дефолтом', async () => {
    vi.mocked(getSiteSettings).mockResolvedValue({
      child_free_age_limit: '0',
      max_guests_absolute: '10',
      calculator_formula: '',
    } as any);
    vi.mocked(getAllTariffs).mockResolvedValue(BUILTIN_TARIFFS(0, 0) as any);

    const rules = await getPricingRules();

    expect(rules.childFreeAgeLimit).toBe(0);
    expect(rules.secondGuestPrice).toBe(0);
    expect(rules.extraGuestPrice).toBe(0);
  });

  it('доп. тарифы с in_calculator=true попадают в additionalTariffs, остальные — нет', async () => {
    vi.mocked(getSiteSettings).mockResolvedValue({
      child_free_age_limit: '7',
      max_guests_absolute: '10',
      calculator_formula: '',
    } as any);
    vi.mocked(getAllTariffs).mockResolvedValue([
      ...BUILTIN_TARIFFS(400, 800),
      { id: 3, tariff_key: 'pet_deposit', label: 'Депозит за животных', price: 800, is_builtin: false, in_calculator: true, sort_order: 30 },
      { id: 4, tariff_key: 'unused', label: 'Не в калькуляторе', price: 100, is_builtin: false, in_calculator: false, sort_order: 40 },
    ] as any);

    const rules = await getPricingRules();

    expect(rules.additionalTariffs).toEqual([
      { key: 'pet_deposit', label: 'Депозит за животных', price: 800 },
    ]);
  });
});
