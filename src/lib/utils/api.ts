/**
 * Утилита для выполнения HTTP-запросов с единообразной обработкой ошибок.
 * Позволяет избежать дублирования fetch-логики в компонентах.
 */

interface ApiError {
  error?: string;
  message?: string;
}

async function request<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    // если ответ не JSON – игнорируем
  }

  if (!res.ok) {
    const message =
      (data as ApiError)?.error ||
      (data as ApiError)?.message ||
      `Ошибка (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};