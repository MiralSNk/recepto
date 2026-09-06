import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FORMULA,
  describeFormula,
  evaluateFormula,
  extractIdentifiers,
  isCardPresent,
  isCardScaledBy,
  parseFormula,
  tokenize,
} from './formula';

const KNOWN = ['base', 'days', 'second_guest', 'extra_guest', 'pet_deposit'];

describe('tokenize', () => {
  it('разбивает формулу на токены, игнорируя пробелы', () => {
    const tokens = tokenize('(base + days) * second_guest');
    expect(tokens).not.toHaveProperty('error');
    expect(tokens).toEqual([
      { type: 'lparen' },
      { type: 'ident', value: 'base' },
      { type: 'op', value: '+' },
      { type: 'ident', value: 'days' },
      { type: 'rparen' },
      { type: 'op', value: '*' },
      { type: 'ident', value: 'second_guest' },
    ]);
  });

  it('сообщает об ошибке на недопустимом символе', () => {
    const result = tokenize('base / days');
    expect(result).toHaveProperty('error');
  });
});

describe('parseFormula', () => {
  it('пустая формула — ошибка', () => {
    expect(parseFormula('', KNOWN)).toHaveProperty('error');
    expect(parseFormula('   ', KNOWN)).toHaveProperty('error');
  });

  it('неизвестный идентификатор — ошибка', () => {
    const result = parseFormula('base + unknown_card', KNOWN);
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('unknown_card');
  });

  it('непарные скобки — ошибка (не закрыта)', () => {
    expect(parseFormula('(base + days', KNOWN)).toHaveProperty('error');
  });

  it('непарные скобки — ошибка (лишняя закрывающая)', () => {
    expect(parseFormula('base + days)', KNOWN)).toHaveProperty('error');
  });

  it('два оператора подряд — ошибка', () => {
    expect(parseFormula('base + + days', KNOWN)).toHaveProperty('error');
  });

  it('висящий оператор в конце — ошибка', () => {
    expect(parseFormula('base +', KNOWN)).toHaveProperty('error');
  });

  it('ведущий оператор — ошибка (унарного минуса нет)', () => {
    expect(parseFormula('+ base', KNOWN)).toHaveProperty('error');
  });

  it('два идентификатора подряд без оператора — ошибка', () => {
    expect(parseFormula('base days', KNOWN)).toHaveProperty('error');
  });

  it('деления в грамматике нет — токенайзер отвергает "/"', () => {
    expect(parseFormula('base / days', KNOWN)).toHaveProperty('error');
  });

  it('валидная формула с вложенными скобками парсится', () => {
    const result = parseFormula('((base + second_guest) + extra_guest) * days', KNOWN);
    expect(result).toHaveProperty('ast');
  });
});

describe('evaluateFormula', () => {
  const cardValues = { base: 3000, days: 1, second_guest: 400, extra_guest: 1600, pet_deposit: 800 };

  it('дефолтная формула воспроизводит текущую позиционную логику: (base+second+extra)*days', () => {
    const parsed = parseFormula(DEFAULT_FORMULA, KNOWN);
    if (!('ast' in parsed)) throw new Error('formula должна парситься');
    expect(evaluateFormula(parsed.ast, cardValues)).toBe((3000 + 400 + 1600) * 1);
  });

  it('дефолтная формула корректно умножает на число ночей > 1', () => {
    const parsed = parseFormula(DEFAULT_FORMULA, KNOWN);
    if (!('ast' in parsed)) throw new Error('formula должна парситься');
    expect(evaluateFormula(parsed.ast, { ...cardValues, days: 3 })).toBe((3000 + 400 + 1600) * 3);
  });

  it('разовый сбор вне скобок с умножением не домножается на дни', () => {
    // (base * days) + pet_deposit — депозит платится один раз, а не за каждую ночь.
    const parsed = parseFormula('(base * days) + pet_deposit', KNOWN);
    if (!('ast' in parsed)) throw new Error('formula должна парситься');
    expect(evaluateFormula(parsed.ast, { ...cardValues, days: 3 })).toBe(3000 * 3 + 800);
  });

  it('бинарный минус вычитает', () => {
    const parsed = parseFormula('base - second_guest', KNOWN);
    if (!('ast' in parsed)) throw new Error('formula должна парситься');
    expect(evaluateFormula(parsed.ast, cardValues)).toBe(2600);
  });

  it('неизвестная в cardValues карточка трактуется как 0', () => {
    const parsed = parseFormula('base + second_guest', KNOWN);
    if (!('ast' in parsed)) throw new Error('formula должна парситься');
    expect(evaluateFormula(parsed.ast, { base: 1000 })).toBe(1000);
  });
});

describe('describeFormula', () => {
  it('переводит AST в читаемую строку с метками карточек', () => {
    const parsed = parseFormula(DEFAULT_FORMULA, KNOWN);
    if (!('ast' in parsed)) throw new Error('formula должна парситься');
    const labels = { base: 'Цена номера', days: 'Число ночей', second_guest: '2-й гость', extra_guest: '3-й+ гость' };
    const text = describeFormula(parsed.ast, labels);
    expect(text).toContain('Цена номера');
    expect(text).toContain('Число ночей');
    expect(text).toContain('×');
  });
});

describe('isCardPresent / isCardScaledBy — классификация "за ночь / разово" для человеко-читаемого пояснения ИИ', () => {
  it('в дефолтной формуле все три карточки домножаются на days', () => {
    const parsed = parseFormula(DEFAULT_FORMULA, KNOWN);
    if (!('ast' in parsed)) throw new Error('formula должна парситься');
    expect(isCardScaledBy(parsed.ast, 'base', 'days')).toBe(true);
    expect(isCardScaledBy(parsed.ast, 'second_guest', 'days')).toBe(true);
    expect(isCardScaledBy(parsed.ast, 'extra_guest', 'days')).toBe(true);
  });

  it('разовый сбор вне умножения на days классифицируется как НЕ масштабируемый', () => {
    const parsed = parseFormula('(base * days) + pet_deposit', KNOWN);
    if (!('ast' in parsed)) throw new Error('formula должна парситься');
    expect(isCardScaledBy(parsed.ast, 'base', 'days')).toBe(true);
    expect(isCardScaledBy(parsed.ast, 'pet_deposit', 'days')).toBe(false);
    expect(isCardPresent(parsed.ast, 'pet_deposit')).toBe(true);
  });

  it('карточки, отсутствующей в формуле, isCardPresent возвращает false, а isCardScaledBy — false, а не бросает ошибку', () => {
    const parsed = parseFormula('base + second_guest', KNOWN);
    if (!('ast' in parsed)) throw new Error('formula должна парситься');
    expect(isCardPresent(parsed.ast, 'pet_deposit')).toBe(false);
    expect(isCardScaledBy(parsed.ast, 'pet_deposit', 'days')).toBe(false);
  });

  it('умножение распространяется через вложенные скобки на все слагаемые внутри', () => {
    const parsed = parseFormula('((base + second_guest) + extra_guest) * days', KNOWN);
    if (!('ast' in parsed)) throw new Error('formula должна парситься');
    expect(isCardScaledBy(parsed.ast, 'second_guest', 'days')).toBe(true);
    expect(isCardScaledBy(parsed.ast, 'extra_guest', 'days')).toBe(true);
  });
});

describe('extractIdentifiers', () => {
  it('находит все идентификаторы, включая в битом синтаксисе', () => {
    expect(extractIdentifiers('base + + second_guest (')).toEqual(['base', 'second_guest']);
  });

  it('пустая строка — пустой список', () => {
    expect(extractIdentifiers('')).toEqual([]);
  });
});
