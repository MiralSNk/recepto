import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import YandexMetrika from './YandexMetrika';

describe('YandexMetrika', () => {
  it('ничего не рендерит для нечислового id (защита на случай, если сюда всё же попадёт что-то кроме цифр)', () => {
    const { container } = render(<YandexMetrika counterId="abc123" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('ничего не рендерит для пустой строки', () => {
    const { container } = render(<YandexMetrika counterId="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('рендерит что-то (не пусто) для валидного числового счётчика, не падает', () => {
    // jsdom не парсит содержимое <noscript> как реальные DOM-узлы (так и
    // должно быть при "включённом JS", как в браузере) — проверяем только,
    // что валидный id проходит защиту и рендер не падает, а не внутренности.
    const { container } = render(<YandexMetrika counterId="12345678" />);
    expect(container).not.toBeEmptyDOMElement();
  });
});
