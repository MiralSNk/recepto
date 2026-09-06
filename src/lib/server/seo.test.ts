import { describe, it, expect } from 'vitest';
import { phoneToTelHref } from '@/lib/server/seo';

describe('phoneToTelHref', () => {
  it('нормализует 8… в +7', () => {
    expect(phoneToTelHref('+7 (000) 000-00-00')).toMatch(/^tel:\+7/);
  });
  it('пустой → пустая строка', () => {
    expect(phoneToTelHref('')).toBe('');
  });
});