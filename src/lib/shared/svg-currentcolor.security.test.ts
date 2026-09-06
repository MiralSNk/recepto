import { describe, it, expect } from 'vitest';
import { applyCurrentColorToSvg } from './svg-currentcolor';

/**
 * Регрессионные тесты на computeSkipRanges/isInRanges в
 * applyCurrentColorToSvg — случаи, где вычисление "защищённых" диапазонов
 * (defs/mask/clipPath/градиенты) раньше путалось на вложенных/
 * пересекающихся конструкциях и подменяло fill там, где по структуре SVG
 * делать этого нельзя (ломает реальное маскирование/градиент, а не просто
 * красит иконку). computeSkipRanges теперь использует стек глубины (не
 * нежадный regex-backreference) и закрывает диапазон, только когда стек
 * полностью опустел — оба теста ниже ДОЛЖНЫ ПРОХОДИТЬ.
 */
describe('applyCurrentColorToSvg — путаница в диапазонах пропуска (закрытая проблема, регресс-тесты)', () => {
  it('вложенный <mask> с тем же именем тега не схлопывает диапазон пропуска раньше времени', () => {
    // Раньше вычисление диапазона регексом с нежадным backreference ловило
    // ПЕРВОЕ закрытие ТОГО ЖЕ имени тега — для вложенного <mask> диапазон
    // обрывался на закрытии ВНУТРЕННЕГО </mask>, а не внешнего, и второй
    // <rect> (текстуально между внутренним и внешним </mask>, то есть по
    // структуре SVG всё ещё внутри маски) подменялся на currentColor, ломая
    // маску. Стек глубины в computeSkipRanges фиксирует диапазон только
    // когда закрылся самый внешний тег — второй <rect> теперь защищён.
    const svg =
      '<svg><mask id="m"><mask id="inner"><rect fill="#fff"/></mask>' +
      '<rect fill="#eee"/></mask><path fill="#000" d="a"/></svg>';
    const result = applyCurrentColorToSvg(svg);
    expect(result).toContain('<rect fill="#eee"/>');
  });

  it('<style>-блок внутри <mask> больше не переписывается безусловно, хотя управляет яркостью маски, а не цветом иконки', () => {
    // Раньше STYLE_BLOCK_RE (в отличие от FILL_ATTR_RE/STYLE_ATTR_RE)
    // обрабатывался отдельным проходом без проверки skip-диапазонов вообще —
    // ради Illustrator-паттерна "style внутри defs для группировки классов
    // иконки", но без различия "defs для группировки" от "mask/clipPath, где
    // CSS задаёт реальную яркость/форму". Теперь style-проход тоже проверяет
    // skip-диапазоны — но по более узкому списку тегов (STYLE_BLOCK_SKIP_TAGS,
    // без defs), так что style внутри настоящей маски защищён, а defs-
    // группировка классов по-прежнему обрабатывается как раньше.
    const svg =
      '<svg><mask id="m"><style>.c{fill:#ffffff}</style>' +
      '<rect class="c" width="10" height="10"/></mask><path d="a"/></svg>';
    const result = applyCurrentColorToSvg(svg);
    expect(result).toContain('.c{fill:#ffffff}');
  });
});
