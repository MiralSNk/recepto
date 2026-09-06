'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import '@/styles/error/error.scss';

/**
 * Пропсы компонента глобальной ошибки.
 */
interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary, отображающий сообщение об ошибке.
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="error-page">
      <div className="error-page__content">
        <h1 className="error-page__code">Ошибка</h1>
        <p className="error-page__message">
          Что-то пошло не так. Попробуйте обновить страницу.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <pre className="error-page__debug">{error.message}</pre>
        )}

        <div className="error-page__actions">
          <button
            type="button"
            className="error-page__btn error-page__btn--primary"
            onClick={reset}
          >
            Попробовать снова
          </button>
          <Link href="/" className="error-page__btn error-page__btn--ghost">
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}