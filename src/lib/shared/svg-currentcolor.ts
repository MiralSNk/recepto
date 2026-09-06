// Блоки, где fill управляет не видимым цветом, а маской/обрезкой/градиентом —
// трогать их нельзя, замена там ломает рендер, а не красит иконку.
const SKIP_TAGS = ['defs', 'mask', 'clipPath', 'linearGradient', 'radialGradient'];
// Тот же список без defs — специально для прохода по <style>-блокам (см.
// computeSkipRanges/applyCurrentColorToSvg ниже): defs используется и просто
// для группировки классов иконки (Illustrator/Figma) без всякого отношения
// к маскам, поэтому style-блок внутри defs (без вложенного mask/clipPath/
// градиента) по-прежнему обрабатывается как обычно.
const STYLE_BLOCK_SKIP_TAGS = ['mask', 'clipPath', 'linearGradient', 'radialGradient'];

const FILL_ATTR_RE = /fill\s*=\s*(["'])([^"']*)\1/gi;
// style="...fill:#hex;..." — инлайн-CSS на самом элементе.
const STYLE_ATTR_RE = /style\s*=\s*(["'])([^"']*)\1/gi;
// <style>.cls-1{fill:#hex}</style> — то, как Illustrator/Figma по умолчанию
// экспортируют цвет (через CSS-класс, а не через атрибут fill напрямую).
// FILL_ATTR_RE его не ловит вообще — раньше это было единственной причиной,
// по которой чекбокс «исправить цвет» на таких файлах ничего не менял.
const STYLE_BLOCK_RE = /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi;
// (?<![\w-]) — не даём захватить хвост произвольного свойства/custom property
// вида "--my-fill:" как будто это "fill:".
const CSS_FILL_DECL_RE = /(?<![\w-])fill\s*:\s*([^;"'}]+)/gi;

const UNTOUCHABLE_VALUES = new Set(['none', 'transparent', 'currentcolor', '']);

/**
 * Диапазоны "не трогать" для заданного списка тегов — учитывает вложенность
 * (в т.ч. одного и того же тега в самом себе) через стек глубины, а не
 * регексовый нежадный backreference. Раньше `<(tag)...>[\s\S]*?<\/\1>` ловил
 * ПЕРВОЕ closing-совпадение того же имени тега: для `<mask><mask>...</mask>
 * ...</mask>` диапазон обрывался на закрытии ВНУТРЕННЕГО </mask>, оставляя
 * часть содержимого внешней маски снаружи диапазона — второй fill там
 * подменялся на currentColor и ломал маску. Диапазон фиксируется только
 * когда стек полностью опустел (закрылся самый внешний открытый тег), поэтому
 * вложенные разнотипные skip-теги (mask внутри defs и т.п.) корректно
 * схлопываются в один внешний диапазон, а не теряются.
 */
function computeSkipRanges(svg: string, tags: string[]): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const tagTokenRe = new RegExp(`<\\/?(${tags.join('|')})\\b[^>]*?(\\/?)>`, 'gi');
  const stack: number[] = [];

  let m: RegExpExecArray | null;
  tagTokenRe.lastIndex = 0;
  while ((m = tagTokenRe.exec(svg))) {
    const isClosing = m[0][1] === '/';
    const isSelfClosing = m[2] === '/';

    if (isClosing) {
      const start = stack.pop();
      if (start !== undefined && stack.length === 0) {
        ranges.push([start, m.index + m[0].length]);
      }
    } else if (!isSelfClosing) {
      stack.push(m.index);
    }
    // Самозакрывающийся skip-тег (<mask .../>) — открытие и закрытие в одной
    // точке, содержимого нет, стек не трогаем.
  }
  return ranges;
}

function isInRanges(idx: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([start, end]) => idx >= start && idx < end);
}

function replaceFillDeclarations(css: string): string {
  return css.replace(CSS_FILL_DECL_RE, (match, value: string) => {
    if (UNTOUCHABLE_VALUES.has(value.trim().toLowerCase())) return match;
    return 'fill:currentColor';
  });
}

/**
 * Заменяет захардкоженные цвета заливки на currentColor, чтобы SVG
 * подхватывал цвет из CSS (палитра сайта), не трогая:
 * - fill="none"/"transparent" — это не цвет, а «не заливать» (контур/дырка);
 * - уже currentColor — идемпотентно;
 * - fill внутри <defs>/<mask>/<clipPath>/градиентов — там fill участвует в
 *   маскировании/градиенте, а не в видимом цвете, замена там ломает иконку
 *   визуально непредсказуемо. <style>-блок проверяется на попадание в
 *   mask/clipPath/градиент отдельным (более узким, без defs) списком тегов —
 *   defs нередко используется физически ТОЛЬКО для группировки классов
 *   иконки (так делает Illustrator), не имея отношения к маскам, поэтому
 *   такой style по-прежнему обрабатывается как обычно; а вот style внутри
 *   настоящего mask/clipPath/градиента управляет их яркостью/формой, а не
 *   видимым цветом — переписывать его так же опасно, как fill-атрибут.
 *
 * Цвет в реальных SVG встречается в трёх местах, каждое — отдельный проход
 * (совпадения одного прохода МЕНЯЮТ ДЛИНУ строки, поэтому skip-диапазоны
 * пересчитываются заново для каждого следующего прохода, а не берутся один
 * раз для исходной строки — иначе офсеты второго/третьего прохода уехали бы):
 * 1. fill="#hex" — атрибут напрямую на элементе.
 * 2. style="fill:#hex" — то же самое, но через инлайн-CSS.
 * 3. <style>.cls-1{fill:#hex}</style> + class="cls-1" на элементах — то, как
 *    Illustrator/Figma экспортируют цвет по умолчанию; этот случай раньше
 *    не обрабатывался вовсе.
 *
 * Не различает «случайный залитый прямоугольник-фон» от «основного цвета
 * иконки» — эвристика рассчитана на простые одноцветные глиф-иконки
 * (то, чем обычно являются иконки удобств), не на сложные многоцветные SVG.
 */
export function applyCurrentColorToSvg(svg: string): string {
  let result = svg;

  {
    const skipRanges = computeSkipRanges(result, SKIP_TAGS);
    FILL_ATTR_RE.lastIndex = 0;
    result = result.replace(FILL_ATTR_RE, (match, quote: string, value: string, offset: number) => {
      if (isInRanges(offset, skipRanges)) return match;
      if (UNTOUCHABLE_VALUES.has(value.trim().toLowerCase())) return match;
      return `fill=${quote}currentColor${quote}`;
    });
  }

  {
    const skipRanges = computeSkipRanges(result, SKIP_TAGS);
    STYLE_ATTR_RE.lastIndex = 0;
    result = result.replace(STYLE_ATTR_RE, (match, quote: string, styleValue: string, offset: number) => {
      if (isInRanges(offset, skipRanges)) return match;
      const next = replaceFillDeclarations(styleValue);
      return next === styleValue ? match : `style=${quote}${next}${quote}`;
    });
  }

  {
    const skipRanges = computeSkipRanges(result, STYLE_BLOCK_SKIP_TAGS);
    STYLE_BLOCK_RE.lastIndex = 0;
    result = result.replace(
      STYLE_BLOCK_RE,
      (match, openTag: string, cssText: string, closeTag: string, offset: number) => {
        if (isInRanges(offset, skipRanges)) return match;
        const next = replaceFillDeclarations(cssText);
        return next === cssText ? match : `${openTag}${next}${closeTag}`;
      }
    );
  }

  return result;
}

/** true, если в SVG есть хотя бы один захардкоженный (не currentColor/none) fill. */
export function svgHasHardcodedFill(svg: string): boolean {
  return applyCurrentColorToSvg(svg) !== svg;
}
