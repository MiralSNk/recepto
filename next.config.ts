import type { NextConfig } from 'next';

// CSP: 'unsafe-inline' нужен и в script-src (Next App Router инлайнит RSC/
// hydration payload прямо в HTML), и в style-src (инлайновый <style> с CSS-
// палитрой в src/app/layout.tsx — значения туда строго валидируются на запись,
// см. src/schemas/admin.ts, paletteSchema). Полноценный nonce-based CSP убрал
// бы 'unsafe-inline' для script-src, но требует отдельной проводки nonce через
// middleware/layout — не делаем этого сейчас, чтобы не сломать хайдрацию.
// connect-src перечисляет внешние API, к которым обращается сервер (YandexGPT,
// Overpass, Yandex Search) и которые дёргает сам браузер (капча-виджет).
//
// ВАЖНО про капчу: @yandex/smart-captcha по умолчанию грузит скрипт с
// smartcaptcha.cloud.yandex.ru (см. API_LINK в самой библиотеке), а НЕ с
// smartcaptcha.yandexcloud.net — раньше здесь был указан только второй домен,
// из-за чего CSP молча (без JS-ошибки, только в консоли браузера) блокировал
// сам скрипт капчи, и виджет просто не появлялся ни на одной форме сайта.
// Разрешаем оба домена, чтобы не привязываться к тому, какой именно
// использует конкретная версия библиотеки/региона.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://smartcaptcha.cloud.yandex.ru https://smartcaptcha.yandexcloud.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "frame-src 'self' https://yandex.ru https://*.yandex.ru https://smartcaptcha.cloud.yandex.ru https://smartcaptcha.yandexcloud.net",
  "connect-src 'self' https://smartcaptcha.cloud.yandex.ru https://smartcaptcha.yandexcloud.net https://llm.api.cloud.yandex.net https://searchapi.api.cloud.yandex.net https://overpass-api.de https://overpass.kumi.systems",
  "frame-ancestors 'self'",
].join('; ');

const isProd = process.env.NODE_ENV === 'production';

const config: NextConfig = {
  reactCompiler: true,
  // cacheComponents: true,

  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      // CSP только в проде — в dev-режиме Next HMR использует websocket-
      // соединение, которое пришлось бы отдельно разрешать в connect-src.
      ...(isProd ? [{ key: 'Content-Security-Policy', value: CSP }] : []),
    ];
    return [{ source: '/:path*', headers: securityHeaders }];
  },

  // beforeFiles — срабатывает ДО обычной раздачи статики из public/, поэтому
  // ловит и старые файлы (из прошлых сборок), и только что загруженные через
  // /api/admin/upload (next start не видит их как статику до следующей
  // pnpm build — см. комментарий в src/app/api/serve-upload/[...path]/route.ts).
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/rooms/:path*', destination: '/api/serve-upload/rooms/:path*' },
        { source: '/uploads/:path*', destination: '/api/serve-upload/uploads/:path*' },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
        pathname: '/rooms/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/rooms/**',
      },
    ],
  },

  webpack(config) {
    const fileLoaderRule = config.module.rules.find((rule: any) =>
      rule.test?.test?.('.svg')
    );
    if (fileLoaderRule) {
      fileLoaderRule.exclude = /\.svg$/;
    }

    config.module.rules.push({
      test: /\.svg$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            svgo: true,
            svgoConfig: {
              plugins: [
                { name: 'removeDimensions' },
                { name: 'removeViewBox', active: false },
              ],
            },
          },
        },
      ],
    });

    return config;
  },
};

export default config;