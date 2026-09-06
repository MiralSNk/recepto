/**
 * Лёгкая, регекс-based зачистка SVG перед тем, как его содержимое можно
 * будет безопасно вставить инлайном в HTML страницы (dangerouslySetInnerHTML).
 * Нужна именно потому, что fill="currentColor" физически не работает для
 * SVG, показанного через <img src="...">/фон — браузер рендерит такой SVG в
 * изолированном контексте и не подтягивает CSS страницы. Чтобы currentColor
 * реально подхватывал цвет сайта, SVG приходится вставлять как настоящую
 * разметку — а раз это разметка от загруженного (пусть и только админом)
 * файла, показываемая всем посетителям сайта, её обязательно чистить от
 * потенциально исполняемого содержимого перед вставкой.
 *
 * Не претендует на замену полноценного парсера/DOMPurify — тот же
 * компромисс, что и у svg-currentcolor.ts: рассчитан на простые
 * загружаемые иконки, а не на произвольный SVG из недоверенного источника.
 * Тяжёлые библиотеки (DOMPurify+jsdom на сервере) сознательно не берём —
 * сервер и так ограничен по памяти (см. ecosystem.config.js).
 */

const SCRIPT_RE = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;
const SELF_CLOSING_SCRIPT_RE = /<script\b[^>]*\/>/gi;
// Ловит script БЕЗ закрывающего тега вообще (отрезан/испорчен/умышленно не
// закрыт) — браузер в этом случае дочитывает содержимое script-элемента до
// конца документа, поэтому после двух проходов выше единственный безопасный
// вариант — вырезать всё от оставшегося "<script" и до конца строки целиком.
const UNCLOSED_SCRIPT_RE = /<script\b[\s\S]*/gi;
const FOREIGN_OBJECT_RE = /<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject\s*>/gi;
// on*="..." / on*='...' / on*=bareword — обработчики событий на любом
// элементе. Граница перед "on..." — пробел ИЛИ "/": по алгоритму токенизации
// HTML "/" сразу после имени тега или сразу после закрытой кавычки значения
// атрибута тоже переводит парсер в состояние "начало нового атрибута" —
// "<svg/onload=x>" и "<path fill=\"a\"/onclick=x>" браузер разбирает так же,
// как "<svg onload=\"x\">"/"<path fill=\"a\" onclick=\"x\">" (проверено на
// jsdom/parse5). \s+ ловил только первый случай.
const EVENT_HANDLER_ATTR_RE = /[\s/]+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
// href/xlink:href — потенциальный вектор выполнения кода через javascript:.
const HREF_ATTR_RE = /\s+(xlink:href|href)\s*=\s*("[^"]*"|'[^']*')/gi;

function decodeNumericEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)));
}

// Убирает ASCII control-символы (код < 32: таб, перевод строки и т.п.).
function stripControlChars(str: string): string {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) >= 32) result += str[i];
  }
  return result;
}

// true, если значение href/xlink:href после раскодирования — javascript:.
// Числовые ссылки на символы (&#106; / &#x6A; → "j") браузер раскодирует на
// этапе токенизации значения атрибута — задолго до того, как что-либо
// интерпретирует строку как URI-схему, поэтому проверять нужно
// РАСКОДИРОВАННОЕ значение, а не исходный текст. Управляющие символы
// (таб/перевод строки) внутри схемы браузер тоже игнорирует ("jav\tascript:"
// всё равно исполняется) — убираем их перед сравнением.
function isDangerousHrefValue(rawValueWithQuotes: string): boolean {
  const inner = rawValueWithQuotes.slice(1, -1);
  const decoded = stripControlChars(decodeNumericEntities(inner));
  return decoded.trimStart().toLowerCase().startsWith('javascript:');
}

export function sanitizeSvg(svg: string): string {
  return svg
    .replace(SCRIPT_RE, '')
    .replace(SELF_CLOSING_SCRIPT_RE, '')
    .replace(UNCLOSED_SCRIPT_RE, '')
    .replace(FOREIGN_OBJECT_RE, '')
    .replace(EVENT_HANDLER_ATTR_RE, '')
    .replace(HREF_ATTR_RE, (match, _attrName: string, value: string) =>
      isDangerousHrefValue(value) ? '' : match
    );
}
