import { describe, it, expect } from 'vitest';
import {
  insertOperator,
  operatorToToken,
  removeToken,
  moveToken,
  appendCard,
  sourceToTokens,
  tokensToSource,
} from './formula-builder';
import type { FormulaToken } from '@/lib/shared/formula';

describe('operatorToToken', () => {
  it('транслирует операторы и скобки в токены', () => {
    expect(operatorToToken('+')).toEqual({ type: 'op', value: '+' });
    expect(operatorToToken('(')).toEqual({ type: 'lparen' });
    expect(operatorToToken(')')).toEqual({ type: 'rparen' });
  });
});

describe('insertOperator', () => {
  it('вставляет оператор в начало', () => {
    const tokens: FormulaToken[] = [{ type: 'ident', value: 'base' }];
    const result = insertOperator(tokens, 0, '+');
    expect(result).toEqual([{ type: 'op', value: '+' }, { type: 'ident', value: 'base' }]);
  });

  it('вставляет оператор в середину', () => {
    const tokens: FormulaToken[] = [
      { type: 'ident', value: 'base' },
      { type: 'ident', value: 'days' },
    ];
    const result = insertOperator(tokens, 1, '*');
    expect(tokensToSource(result)).toBe('base * days');
  });

  it('вставляет оператор в конец', () => {
    const tokens: FormulaToken[] = [{ type: 'ident', value: 'base' }];
    const result = insertOperator(tokens, 1, '+');
    expect(tokensToSource(result)).toBe('base +');
  });

  it('не мутирует исходный массив', () => {
    const tokens: FormulaToken[] = [{ type: 'ident', value: 'base' }];
    insertOperator(tokens, 1, '+');
    expect(tokens).toHaveLength(1);
  });
});

describe('appendCard', () => {
  it('добавляет карточку в конец', () => {
    const result = appendCard([{ type: 'ident', value: 'base' }], 'days');
    expect(tokensToSource(result)).toBe('base days');
  });
});

describe('removeToken', () => {
  it('удаляет токен по индексу, не мутируя исходный массив', () => {
    const tokens: FormulaToken[] = [
      { type: 'ident', value: 'base' },
      { type: 'op', value: '+' },
      { type: 'ident', value: 'days' },
    ];
    const result = removeToken(tokens, 1);
    expect(tokensToSource(result)).toBe('base days');
    expect(tokens).toHaveLength(3);
  });
});

describe('moveToken', () => {
  it('переставляет токен на новую позицию', () => {
    const tokens: FormulaToken[] = [
      { type: 'ident', value: 'a' },
      { type: 'ident', value: 'b' },
      { type: 'ident', value: 'c' },
    ];
    const result = moveToken(tokens, 0, 2);
    expect(tokensToSource(result)).toBe('b c a');
  });

  it('одинаковые индексы — массив не меняется', () => {
    const tokens: FormulaToken[] = [{ type: 'ident', value: 'a' }];
    expect(moveToken(tokens, 0, 0)).toBe(tokens);
  });
});

describe('sourceToTokens / tokensToSource — round-trip', () => {
  it('парсит и собирает формулу обратно без потерь (токены сохраняются в том же порядке)', () => {
    // tokensToSource всегда вставляет пробел между токенами (в т.ч. вокруг
    // скобок) — это не баг, а нормализация формата, source не обязан быть
    // побайтово идентичен исходной строке, только последовательность токенов.
    const source = '(base + second_guest) * days';
    const tokens = sourceToTokens(source);
    expect(tokensToSource(tokens)).toBe('( base + second_guest ) * days');
    expect(sourceToTokens(tokensToSource(tokens))).toEqual(tokens);
  });

  it('невалидная строка даёт пустой массив токенов', () => {
    expect(sourceToTokens('base / days')).toEqual([]);
  });
});
