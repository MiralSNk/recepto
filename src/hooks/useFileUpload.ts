'use client';

import { useState } from 'react';

interface UseFileUploadOptions {
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
  /** 'site' (по умолчанию) — Hero/логотипы/иконки, кладутся в /uploads.
   *  'rooms' — фото номеров, требует roomId, кладутся в /rooms/{roomId}. */
  type?: 'site' | 'rooms';
  /** Обязателен при type: 'rooms' — id номера или 'tmp' для ещё не созданного. */
  roomId?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 МБ

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * fixSvgColor — только для SVG: попросить сервер заменить захардкоженные
   * fill на currentColor (см. src/lib/shared/svg-currentcolor.ts), чтобы
   * иконка подхватывала цвет из палитры сайта. По умолчанию выключено —
   * файл сохраняется как есть.
   */
  const upload = async (file: File, opts?: { fixSvgColor?: boolean }): Promise<string | null> => {
    setUploading(true);
    setError(null);

    // Проверка на клиенте до сетевого запроса — file.type может быть пустым
    // (браузер не распознал MIME), но если он есть и не из белого списка,
    // отсекаем сразу понятным сообщением, не дожидаясь ответа сервера.
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      const message = 'Неподдерживаемый формат файла. Разрешены: JPEG, PNG, WEBP, SVG.';
      setError(message);
      options.onError?.(new Error(message));
      setUploading(false);
      return null;
    }
    if (file.size > MAX_FILE_SIZE) {
      const message = 'Файл слишком большой. Максимальный размер — 10 МБ.';
      setError(message);
      options.onError?.(new Error(message));
      setUploading(false);
      return null;
    }

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', options.type ?? 'site');
      if (options.type === 'rooms') {
        fd.append('roomId', options.roomId || 'tmp');
      }
      if (opts?.fixSvgColor) {
        fd.append('fixSvgColor', 'true');
      }

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка загрузки');
      }
      if (!data.url) {
        throw new Error('Сервер не вернул URL файла');
      }

      options.onSuccess?.(data.url);
      return data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки';
      setError(message);
      options.onError?.(err instanceof Error ? err : new Error(message));
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error };
}