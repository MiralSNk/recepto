import { describe, it, expect } from 'vitest';
import { applyCurrentColorToSvg, svgHasHardcodedFill } from './svg-currentcolor';

describe('applyCurrentColorToSvg', () => {
  it('заменяет hex-цвет на currentColor', () => {
    const svg = '<svg><path fill="#173f35" d="M0 0"/></svg>';
    expect(applyCurrentColorToSvg(svg)).toBe('<svg><path fill="currentColor" d="M0 0"/></svg>');
  });

  it('заменяет именованный цвет и rgb()', () => {
    expect(applyCurrentColorToSvg('<path fill="black" d=""/>')).toContain('fill="currentColor"');
    expect(applyCurrentColorToSvg('<path fill="rgb(0,0,0)" d=""/>')).toContain('fill="currentColor"');
  });

  it('не трогает fill="none" — это не цвет, а «не заливать»', () => {
    const svg = '<svg><path fill="none" stroke="#000" d="M0 0"/></svg>';
    expect(applyCurrentColorToSvg(svg)).toBe(svg);
  });

  it('не трогает fill="transparent"', () => {
    const svg = '<rect fill="transparent" width="10" height="10"/>';
    expect(applyCurrentColorToSvg(svg)).toBe(svg);
  });

  it('идемпотентно — уже currentColor не трогает', () => {
    const svg = '<path fill="currentColor" d="M0 0"/>';
    expect(applyCurrentColorToSvg(svg)).toBe(svg);
  });

  it('заменяет несколько fill в одном SVG', () => {
    const svg = '<svg><path fill="#111" d="a"/><circle fill="#89754f" r="5"/></svg>';
    const result = applyCurrentColorToSvg(svg);
    expect(result).toBe('<svg><path fill="currentColor" d="a"/><circle fill="currentColor" r="5"/></svg>');
  });

  it('не трогает fill внутри <defs> (градиенты/маски) — замена там ломает рендер', () => {
    const svg =
      '<svg><defs><linearGradient id="g"><stop fill="#ff0000"/></linearGradient></defs>' +
      '<path fill="#111" d="a"/></svg>';
    const result = applyCurrentColorToSvg(svg);
    expect(result).toContain('<stop fill="#ff0000"/>');
    expect(result).toContain('<path fill="currentColor" d="a"/>');
  });

  it('не трогает fill внутри <mask>', () => {
    const svg = '<svg><mask id="m"><rect fill="#fff" width="10" height="10"/></mask><path fill="#000" d="a"/></svg>';
    const result = applyCurrentColorToSvg(svg);
    expect(result).toContain('<rect fill="#fff" width="10" height="10"/>');
    expect(result).toContain('<path fill="currentColor" d="a"/>');
  });

  it('не трогает fill внутри <clipPath>', () => {
    const svg = '<svg><clipPath id="c"><rect fill="#fff" width="10" height="10"/></clipPath><path fill="#000" d="a"/></svg>';
    const result = applyCurrentColorToSvg(svg);
    expect(result).toContain('<rect fill="#fff" width="10" height="10"/>');
    expect(result).toContain('<path fill="currentColor" d="a"/>');
  });

  // Регрессия: раньше заменялся только буквальный атрибут fill="...", а
  // Illustrator/Figma по умолчанию экспортируют цвет через инлайн-style или
  // CSS-класс — на таких файлах чекбокс молча ничего не менял.
  it('заменяет fill в инлайн style="..."', () => {
    const svg = '<path style="fill:#231f20;stroke:#000" d="a"/>';
    expect(applyCurrentColorToSvg(svg)).toBe('<path style="fill:currentColor;stroke:#000" d="a"/>');
  });

  it('не трогает style="fill:none"', () => {
    const svg = '<path style="fill:none;stroke:#000" d="a"/>';
    expect(applyCurrentColorToSvg(svg)).toBe(svg);
  });

  it('заменяет fill в CSS-классе внутри <style> (типичный экспорт Illustrator/Figma)', () => {
    const svg = '<svg><style>.cls-1{fill:#231f20;}</style><path class="cls-1" d="a"/></svg>';
    const result = applyCurrentColorToSvg(svg);
    expect(result).toContain('.cls-1{fill:currentColor;}');
  });

  it('исправляет <style> с CSS-классом, даже когда он физически лежит внутри <defs>', () => {
    // Illustrator часто кладёт <style> внутрь <defs> просто для группировки —
    // это не «маскирующий» fill, его нужно чинить, а не пропускать.
    const svg = '<svg><defs><style>.cls-1{fill:#231f20;}</style></defs><path class="cls-1" d="a"/></svg>';
    const result = applyCurrentColorToSvg(svg);
    expect(result).toContain('.cls-1{fill:currentColor;}');
  });

  it('не трогает произвольное CSS-свойство, заканчивающееся на "fill" (например, кастомное свойство)', () => {
    const svg = '<style>.cls-1{--my-fill:#231f20;}</style>';
    expect(applyCurrentColorToSvg(svg)).toBe(svg);
  });

  it('несколько классов в одном <style> — заменяются все, кроме none/currentColor', () => {
    const svg = '<style>.cls-1{fill:#111}.cls-2{fill:none}.cls-3{fill:currentColor}</style>';
    const result = applyCurrentColorToSvg(svg);
    expect(result).toBe('<style>.cls-1{fill:currentColor}.cls-2{fill:none}.cls-3{fill:currentColor}</style>');
  });
});

describe('svgHasHardcodedFill', () => {
  it('true, если есть захардкоженный цвет', () => {
    expect(svgHasHardcodedFill('<path fill="#111" d="a"/>')).toBe(true);
  });

  it('false, если уже currentColor', () => {
    expect(svgHasHardcodedFill('<path fill="currentColor" d="a"/>')).toBe(false);
  });

  it('false, если только fill="none"', () => {
    expect(svgHasHardcodedFill('<path fill="none" stroke="#000" d="a"/>')).toBe(false);
  });
});
