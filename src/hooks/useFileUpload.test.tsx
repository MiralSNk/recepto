import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from './useFileUpload';

function makeFile(name: string, type: string, sizeBytes: number): File {
  const file = new File([new Uint8Array(sizeBytes)], name, { type });
  return file;
}

describe('useFileUpload', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('отклоняет неподдерживаемый тип файла до сетевого запроса', async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      const url = await result.current.upload(makeFile('photo.heic', 'image/heic', 1024));
      expect(url).toBeNull();
    });

    expect(result.current.error).toMatch(/формат/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('отклоняет слишком большой файл до сетевого запроса', async () => {
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      const url = await result.current.upload(makeFile('big.jpg', 'image/jpeg', 11 * 1024 * 1024));
      expect(url).toBeNull();
    });

    expect(result.current.error).toMatch(/большой/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('пропускает валидный файл в сетевой запрос', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ url: '/uploads/abc.jpg' }),
    });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useFileUpload({ onSuccess }));

    await act(async () => {
      const url = await result.current.upload(makeFile('photo.jpg', 'image/jpeg', 1024));
      expect(url).toBe('/uploads/abc.jpg');
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/admin/upload', expect.objectContaining({ method: 'POST' }));
    expect(onSuccess).toHaveBeenCalledWith('/uploads/abc.jpg');
    expect(result.current.error).toBeNull();
  });

  it('пропускает файл без определённого MIME-типа (браузер не распознал)', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ url: '/uploads/abc.jpg' }),
    });
    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      const url = await result.current.upload(makeFile('photo', '', 1024));
      expect(url).toBe('/uploads/abc.jpg');
    });

    expect(global.fetch).toHaveBeenCalled();
  });
});
