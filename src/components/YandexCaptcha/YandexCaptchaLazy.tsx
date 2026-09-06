'use client';
import dynamic from 'next/dynamic';

export default dynamic(() => import('./YandexCaptcha'), {
  ssr: false,
  loading: () => <div style={{ minHeight: 100 }}>Загрузка капчи…</div>,
});