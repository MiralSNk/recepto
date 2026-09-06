'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Ловит ошибки в самом корневом layout (например, если упал запрос к БД
 * при построении палитры/настроек) — src/app/error.tsx туда не достаёт,
 * т.к. рендерится уже ВНУТРИ layout. global-error обязан сам объявлять
 * <html>/<body> и не может полагаться на стили/данные из упавшего layout —
 * поэтому только инлайн-стили, без DB и без CSS-переменных палитры.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global app error:', error);
  }, [error]);

  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: '#F5F0E8',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 28, color: '#173f35', marginBottom: 12 }}>
              Что-то пошло не так
            </h1>
            <p style={{ fontSize: 16, color: '#555', marginBottom: 24, lineHeight: 1.5 }}>
              Сайт временно недоступен. Мы уже знаем об этом — попробуйте обновить страницу
              через минуту.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: '12px 24px',
                background: '#173f35',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
