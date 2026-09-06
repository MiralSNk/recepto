import { describe, it, expect } from 'vitest';
import { buildClonedSlides } from './useGalleryTrack';

describe('buildClonedSlides', () => {
  it('возвращает список без изменений, если 0 или 1 элемент', () => {
    expect(buildClonedSlides([])).toEqual([]);
    expect(buildClonedSlides(['a'])).toEqual(['a']);
  });

  it('дублирует последний элемент в начало и первый в конец для loop-эффекта', () => {
    const result = buildClonedSlides(['a', 'b', 'c']);
    expect(result).toEqual(['c', 'a', 'b', 'c', 'a']);
  });

  it('работает с двумя элементами', () => {
    const result = buildClonedSlides(['a', 'b']);
    expect(result).toEqual(['b', 'a', 'b', 'a']);
  });
});
