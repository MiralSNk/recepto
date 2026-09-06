/**
 * Чистые функции без React — ядро конструктора формулы. Работают над
 * плоским массивом токенов (FormulaToken из src/lib/shared/formula.ts),
 * который в UI рендерится как ряд перетаскиваемых чипов.
 */
import type { FormulaToken } from '@/lib/shared/formula';
import { tokenize } from '@/lib/shared/formula';

export type OperatorSymbol = '+' | '-' | '*' | '(' | ')';

export function tokenToSource(tok: FormulaToken): string {
  if (tok.type === 'ident') return tok.value;
  if (tok.type === 'op') return tok.value;
  if (tok.type === 'lparen') return '(';
  return ')';
}

export function tokensToSource(tokens: FormulaToken[]): string {
  return tokens.map(tokenToSource).join(' ');
}

/** Разбирает строку формулы обратно в токены для инициализации редактора. */
export function sourceToTokens(source: string): FormulaToken[] {
  const result = tokenize(source);
  return Array.isArray(result) ? result : [];
}

export function operatorToToken(op: OperatorSymbol): FormulaToken {
  if (op === '(') return { type: 'lparen' };
  if (op === ')') return { type: 'rparen' };
  return { type: 'op', value: op };
}

/** Вставляет оператор/скобку в «щель» с индексом gapIndex (0..tokens.length). */
export function insertOperator(
  tokens: FormulaToken[],
  gapIndex: number,
  op: OperatorSymbol
): FormulaToken[] {
  const next = [...tokens];
  next.splice(gapIndex, 0, operatorToToken(op));
  return next;
}

export function appendCard(tokens: FormulaToken[], cardKey: string): FormulaToken[] {
  return [...tokens, { type: 'ident', value: cardKey }];
}

export function removeToken(tokens: FormulaToken[], index: number): FormulaToken[] {
  const next = [...tokens];
  next.splice(index, 1);
  return next;
}

export function moveToken(tokens: FormulaToken[], fromIndex: number, toIndex: number): FormulaToken[] {
  if (fromIndex === toIndex) return tokens;
  const next = [...tokens];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
