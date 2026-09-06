/**
 * Безопасный движок арифметических формул калькулятора цены.
 *
 * Формула — это выражение над «карточками» (base/days/тарифы), собранное
 * администратором в конструкторе: только идентификаторы карточек,
 * бинарные + - *, скобки. Никаких числовых литералов (иначе константу
 * можно вписать вручную мимо тарифа — ровно та же лазейка для рассинхрона,
 * которую эта фича должна закрыть) и никакого деления (не нужно по
 * спецификации, заодно структурно исключает деление на 0). Вычисляется
 * ручным рекурсивным спуском — ни eval, ни new Function нигде не используются.
 */

export const RESERVED_CARD_KEYS = ['base', 'days'] as const;
export const DEFAULT_FORMULA = '(base + second_guest + extra_guest) * days';

export type FormulaToken =
  | { type: 'ident'; value: string }
  | { type: 'op'; value: '+' | '-' | '*' }
  | { type: 'lparen' }
  | { type: 'rparen' };

export type FormulaNode =
  | { type: 'ident'; key: string }
  | { type: 'binary'; op: '+' | '-' | '*'; left: FormulaNode; right: FormulaNode };

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function tokenize(source: string): FormulaToken[] | { error: string } {
  const tokens: FormulaToken[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*') {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i + 1;
      while (j < source.length && /[a-zA-Z0-9_]/.test(source[j])) j++;
      const value = source.slice(i, j);
      tokens.push({ type: 'ident', value });
      i = j;
      continue;
    }
    return { error: `Недопустимый символ в формуле: "${ch}"` };
  }
  return tokens;
}

interface ParseState {
  tokens: FormulaToken[];
  pos: number;
  knownCardKeys: Set<string>;
}

function peek(state: ParseState): FormulaToken | undefined {
  return state.tokens[state.pos];
}

function parsePrimary(state: ParseState): FormulaNode | { error: string } {
  const tok = peek(state);
  if (!tok) return { error: 'Формула обрывается там, где ожидался тариф или скобка' };
  if (tok.type === 'ident') {
    if (!state.knownCardKeys.has(tok.value)) {
      return { error: `Неизвестный тариф в формуле: "${tok.value}"` };
    }
    state.pos++;
    return { type: 'ident', key: tok.value };
  }
  if (tok.type === 'lparen') {
    state.pos++;
    const inner = parseExpr(state);
    if ('error' in inner) return inner;
    const close = peek(state);
    if (!close || close.type !== 'rparen') {
      return { error: 'Непарные скобки в формуле' };
    }
    state.pos++;
    return inner;
  }
  return { error: `Ожидался тариф или "(", получено "${tokenLabel(tok)}"` };
}

function parseTerm(state: ParseState): FormulaNode | { error: string } {
  let left = parsePrimary(state);
  if ('error' in left) return left;
  for (;;) {
    const tok = peek(state);
    if (!tok || tok.type !== 'op' || tok.value !== '*') break;
    state.pos++;
    const right = parsePrimary(state);
    if ('error' in right) return right;
    left = { type: 'binary', op: '*', left, right };
  }
  return left;
}

function parseExpr(state: ParseState): FormulaNode | { error: string } {
  let left = parseTerm(state);
  if ('error' in left) return left;
  for (;;) {
    const tok = peek(state);
    if (!tok || tok.type !== 'op' || (tok.value !== '+' && tok.value !== '-')) break;
    const op = tok.value;
    state.pos++;
    const right = parseTerm(state);
    if ('error' in right) return right;
    left = { type: 'binary', op, left, right };
  }
  return left;
}

function tokenLabel(tok: FormulaToken): string {
  if (tok.type === 'ident') return tok.value;
  if (tok.type === 'op') return tok.value;
  if (tok.type === 'lparen') return '(';
  return ')';
}

export function parseFormula(
  source: string,
  knownCardKeys: string[]
): { ast: FormulaNode } | { error: string } {
  if (!source || !source.trim()) {
    return { error: 'Формула не может быть пустой' };
  }
  const tokens = tokenize(source);
  if ('error' in tokens) return tokens;
  if (tokens.length === 0) {
    return { error: 'Формула не может быть пустой' };
  }
  const state: ParseState = { tokens, pos: 0, knownCardKeys: new Set(knownCardKeys) };
  const ast = parseExpr(state);
  if ('error' in ast) return ast;
  if (state.pos !== tokens.length) {
    return { error: `Некорректная формула рядом с "${tokenLabel(tokens[state.pos])}"` };
  }
  return { ast };
}

export function evaluateFormula(ast: FormulaNode, cardValues: Record<string, number>): number {
  if (ast.type === 'ident') {
    return cardValues[ast.key] ?? 0;
  }
  const left = evaluateFormula(ast.left, cardValues);
  const right = evaluateFormula(ast.right, cardValues);
  if (ast.op === '+') return left + right;
  if (ast.op === '-') return left - right;
  return left * right;
}

function describeNode(ast: FormulaNode, cardLabels: Record<string, string>, parentPrec: number): string {
  if (ast.type === 'ident') {
    return cardLabels[ast.key] ?? ast.key;
  }
  const prec = ast.op === '*' ? 2 : 1;
  const opSymbol = ast.op === '*' ? '×' : ast.op;
  const text = `${describeNode(ast.left, cardLabels, prec)} ${opSymbol} ${describeNode(ast.right, cardLabels, prec + 1)}`;
  return prec < parentPrec ? `(${text})` : text;
}

export function describeFormula(ast: FormulaNode, cardLabels: Record<string, string>): string {
  return describeNode(ast, cardLabels, 0);
}

/**
 * Регекс-скан идентификаторов в строке формулы, толерантный к битому
 * синтаксису — используется guard'ами удаления/выключения тарифа: даже
 * если сохранённая формула почему-то невалидна, тариф, чей ключ в ней
 * упоминается, всё равно не даём удалить/отключить вслепую.
 */
export function extractIdentifiers(source: string): string[] {
  const matches = source.match(/[a-zA-Z_][a-zA-Z0-9_]*/g);
  return matches ? Array.from(new Set(matches)) : [];
}

function collectIdents(node: FormulaNode): string[] {
  if (node.type === 'ident') return [node.key];
  return [...collectIdents(node.left), ...collectIdents(node.right)];
}

/**
 * Разбивает AST на «мультипликативные группы» — карточки, перемножаемые
 * между собой (`*` распространяется на всё поддерево, включая внутренние
 * +/-, ровно как раскрытие скобок в обычной алгебре), в отличие от карточек,
 * которые складываются/вычитаются отдельно и друг с другом не умножаются.
 * Нужно только для isCardScaledBy — сырую формулу ИИ не показываем
 * (нечитаемо для диалога), вместо этого по этим группам определяем для
 * каждой карточки «за ночь» она или «разово», и уже это говорим человеку.
 */
function collectMultiplicativeGroups(node: FormulaNode): string[][] {
  if (node.type === 'ident') return [[node.key]];
  if (node.op === '*') return [collectIdents(node)];
  return [...collectMultiplicativeGroups(node.left), ...collectMultiplicativeGroups(node.right)];
}

export function isCardPresent(ast: FormulaNode, cardKey: string): boolean {
  return collectIdents(ast).includes(cardKey);
}

/**
 * true, если карточка cardKey в формуле всегда умножается (напрямую или
 * через раскрытие скобок) на карточку scalingCardKey — практически:
 * "эта доплата домножается на число ночей (days)". Если карточки в формуле
 * вообще нет — false (isCardPresent покажет это отдельно).
 */
export function isCardScaledBy(ast: FormulaNode, cardKey: string, scalingCardKey: string): boolean {
  const groups = collectMultiplicativeGroups(ast);
  const relevant = groups.filter((g) => g.includes(cardKey));
  if (relevant.length === 0) return false;
  return relevant.every((g) => g.includes(scalingCardKey));
}
