'use client';

import { SmartCaptcha } from '@yandex/smart-captcha';

export default function YandexCaptcha({
  onSuccess,
  resetKey = 0,
}: {
  onSuccess: (token: string) => void;
  resetKey?: number;
}) {
  const sitekey = process.env.NEXT_PUBLIC_YANDEX_CAPTCHA_SITEKEY;

  if (!sitekey) {
    return (
      <p style={{ color: '#c62828', fontSize: 14 }}>
        Не задан NEXT_PUBLIC_YANDEX_CAPTCHA_SITEKEY
      </p>
    );
  }

  return (
    <div
      className="yandex-captcha-host"
      style={{ minHeight: 100, width: '100%' }}
    >
      <SmartCaptcha
        key={resetKey}
        sitekey={sitekey}
        onSuccess={onSuccess}
        onNetworkError={() => {
          console.error('SmartCaptcha network error');
        }}
      />
    </div>
  );
}