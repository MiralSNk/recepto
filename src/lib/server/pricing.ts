import 'server-only';
import { getSiteSettings } from './seo';
import { getAllTariffs } from './tariffs-db';
import { DEFAULT_FORMULA } from '@/lib/shared/formula';
import { DEFAULT_SECOND_GUEST_PRICE, DEFAULT_EXTRA_GUEST_PRICE } from '@/lib/shared/pricing';

export interface PricingRules {
  childFreeAgeLimit: number;
  secondGuestPrice: number;
  /** Доплата за 3-го и каждого следующего гостя. */
  extraGuestPrice: number;
  maxGuestsAbsolute: number;
  formula: string;
  /** Доп. тарифы с in_calculator=true — доступны как карточки формулы. */
  additionalTariffs: { key: string; label: string; price: number }[];
}

const DEFAULTS = {
  childFreeAgeLimit: 7,
  secondGuestPrice: DEFAULT_SECOND_GUEST_PRICE,
  extraGuestPrice: DEFAULT_EXTRA_GUEST_PRICE,
  maxGuestsAbsolute: 10,
};

function toPositiveInt(value: string, fallback: number): number {
  // Number('') === 0 в JS — пустая (ещё не заполненная в админке) настройка
  // без явной проверки на trim() молча превращалась в 0 вместо дефолта
  // (0 гостей максимум, 0₽ доплата и т.д.), а не проходила как "не задано".
  if (!value || !value.trim()) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

/**
 * Глобальные тарифные настройки (возрастной порог, доплаты за 2-го/3-го+
 * гостя, доп. тарифы, формула калькулятора). secondGuestPrice/extraGuestPrice
 * читаются из каталога тарифов (builtin-строки), а не из site_settings —
 * см. миграцию 015 и src/types/tariff.ts. Кэшируются вместе с остальными
 * source-данными через unstable_cache внутри getSiteSettings()/getAllTariffs().
 */
export async function getPricingRules(): Promise<PricingRules> {
  const [settings, tariffs] = await Promise.all([getSiteSettings(), getAllTariffs()]);

  const second = tariffs.find((t) => t.tariff_key === 'second_guest');
  const extra = tariffs.find((t) => t.tariff_key === 'extra_guest');

  return {
    childFreeAgeLimit: toPositiveInt(settings.child_free_age_limit, DEFAULTS.childFreeAgeLimit),
    secondGuestPrice: second?.price ?? DEFAULTS.secondGuestPrice,
    extraGuestPrice: extra?.price ?? DEFAULTS.extraGuestPrice,
    maxGuestsAbsolute: toPositiveInt(settings.max_guests_absolute, DEFAULTS.maxGuestsAbsolute),
    formula: settings.calculator_formula || DEFAULT_FORMULA,
    additionalTariffs: tariffs
      .filter((t) => !t.is_builtin && t.in_calculator)
      .map((t) => ({ key: t.tariff_key, label: t.label, price: t.price })),
  };
}
