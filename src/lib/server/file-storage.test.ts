import { describe, it, expect, vi, beforeEach } from 'vitest';

const unlinkMock = vi.fn();
vi.mock('node:fs/promises', () => ({
  unlink: (...args: unknown[]) => unlinkMock(...args),
}));

import path from 'node:path';
import { resolveUploadPath, deleteUploadedFile, deleteUploadedFiles } from './file-storage';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

describe('resolveUploadPath', () => {
  it('валидный /uploads/... путь', () => {
    expect(resolveUploadPath('/uploads/abc.webp')).toBe(path.join(PUBLIC_DIR, 'uploads', 'abc.webp'));
  });

  it('валидный /rooms/12/... путь (несколько сегментов)', () => {
    expect(resolveUploadPath('/rooms/12/abc.webp')).toBe(path.join(PUBLIC_DIR, 'rooms', '12', 'abc.webp'));
  });

  it('обрезает query/hash перед разбором', () => {
    expect(resolveUploadPath('/uploads/abc.webp?v=2')).toBe(path.join(PUBLIC_DIR, 'uploads', 'abc.webp'));
  });

  it('null для пустой строки', () => {
    expect(resolveUploadPath('')).toBeNull();
  });

  it('null для статичного ассета вне uploads/rooms (например дефолтный /hero-bg.png)', () => {
    expect(resolveUploadPath('/hero-bg.png')).toBeNull();
  });

  it('null для внешнего URL', () => {
    expect(resolveUploadPath('https://example.com/x.webp')).toBeNull();
  });

  it('null при попытке выйти за пределы public/ через ".."', () => {
    expect(resolveUploadPath('/uploads/../../etc/passwd')).toBeNull();
  });

  it('null при пустом сегменте (двойной слэш)', () => {
    expect(resolveUploadPath('/uploads//abc.webp')).toBeNull();
  });
});

describe('deleteUploadedFile', () => {
  beforeEach(() => {
    unlinkMock.mockReset();
  });

  it('вызывает unlink с правильным путём для валидного URL', async () => {
    unlinkMock.mockResolvedValueOnce(undefined);
    await deleteUploadedFile('/uploads/abc.webp');
    expect(unlinkMock).toHaveBeenCalledWith(path.join(PUBLIC_DIR, 'uploads', 'abc.webp'));
  });

  it('не вызывает unlink для null/undefined/пустой строки', async () => {
    await deleteUploadedFile(null);
    await deleteUploadedFile(undefined);
    await deleteUploadedFile('');
    expect(unlinkMock).not.toHaveBeenCalled();
  });

  it('не вызывает unlink для невалидного (не uploads/rooms) URL', async () => {
    await deleteUploadedFile('/hero-bg.png');
    expect(unlinkMock).not.toHaveBeenCalled();
  });

  it('ENOENT не бросает исключение — файл уже отсутствует, это не ошибка', async () => {
    const err = Object.assign(new Error('not found'), { code: 'ENOENT' });
    unlinkMock.mockRejectedValueOnce(err);
    await expect(deleteUploadedFile('/uploads/gone.webp')).resolves.toBeUndefined();
  });

  it('прочая ошибка тоже не бросает — чистка файла best-effort, не должна ронять вызывающую операцию', async () => {
    unlinkMock.mockRejectedValueOnce(new Error('EACCES'));
    await expect(deleteUploadedFile('/uploads/locked.webp')).resolves.toBeUndefined();
  });
});

describe('deleteUploadedFiles', () => {
  beforeEach(() => {
    unlinkMock.mockReset();
  });

  it('пытается удалить каждый файл из списка, даже если часть невалидна', async () => {
    unlinkMock.mockResolvedValue(undefined);
    await deleteUploadedFiles(['/uploads/a.webp', null, '/hero-bg.png', '/rooms/5/b.webp']);
    expect(unlinkMock).toHaveBeenCalledTimes(2);
  });
});
