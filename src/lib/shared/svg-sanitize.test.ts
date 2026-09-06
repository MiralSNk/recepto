import { describe, it, expect } from 'vitest';
import { sanitizeSvg } from './svg-sanitize';

describe('sanitizeSvg', () => {
  it('вырезает <script>', () => {
    const svg = '<svg><script>alert(1)</script><path fill="#000" d="a"/></svg>';
    expect(sanitizeSvg(svg)).toBe('<svg><path fill="#000" d="a"/></svg>');
  });

  it('вырезает самозакрывающийся <script/>', () => {
    const svg = '<svg><script src="evil.js"/><path fill="#000" d="a"/></svg>';
    expect(sanitizeSvg(svg)).toBe('<svg><path fill="#000" d="a"/></svg>');
  });

  it('вырезает обработчики событий (onload, onclick и т.п.)', () => {
    const svg = '<svg onload="alert(1)"><path onclick=\'evil()\' fill="#000" d="a"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toMatch(/onload/i);
    expect(result).not.toMatch(/onclick/i);
    expect(result).toContain('fill="#000"');
  });

  it('вырезает <foreignObject>', () => {
    const svg = '<svg><foreignObject><div>html</div></foreignObject><path fill="#000" d="a"/></svg>';
    expect(sanitizeSvg(svg)).toBe('<svg><path fill="#000" d="a"/></svg>');
  });

  it('вырезает href на javascript:', () => {
    const svg = '<svg><a href="javascript:alert(1)"><path d="a"/></a></svg>';
    expect(sanitizeSvg(svg)).not.toMatch(/javascript:/i);
  });

  it('не трогает обычную безобидную иконку', () => {
    const svg = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M0 0h24v24H0z"/></svg>';
    expect(sanitizeSvg(svg)).toBe(svg);
  });
});
