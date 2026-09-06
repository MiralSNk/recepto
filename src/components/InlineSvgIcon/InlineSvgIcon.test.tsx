import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import InlineSvgIcon from './InlineSvgIcon';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('InlineSvgIcon', () => {
  it('вставляет содержимое SVG инлайном (не через <img>), чтобы currentColor реально подхватывал цвет', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<svg data-testid="inline-svg"><path fill="currentColor" d="M0 0"/></svg>',
      })
    );

    const { container } = render(<InlineSvgIcon src="/uploads/icon.svg" className="x" />);

    await waitFor(() => {
      expect(container.querySelector('svg[data-testid="inline-svg"]')).toBeInTheDocument();
    });
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('до загрузки содержимого показывает <img> как временный фолбэк', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {}))); // никогда не резолвится
    const { container } = render(<InlineSvgIcon src="/uploads/icon.svg" alt="иконка" />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/uploads/icon.svg');
  });

  it('если fetch не удался — остаётся на <img>, не падает', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    const { container } = render(<InlineSvgIcon src="/uploads/icon.svg" />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('img')).toBeInTheDocument();
  });

  it('для не-SVG (PNG/JPEG) сразу рендерит <img>, не делает fetch', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<InlineSvgIcon src="/uploads/photo.png" />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/uploads/photo.png');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
