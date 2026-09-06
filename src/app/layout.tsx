import type { Metadata, Viewport } from 'next';
import { getPalette, getSiteSettings, getPricingRules } from '@/lib/index.server';
import '@/styles/_globals.scss';
import { Inter } from 'next/font/google';

import Header from '@/components/Header/Header';
import ScrollToTop from '@/components/ScrollToTop/ScrollToTop';
import ChatWidget from '@/components/ChatWidget/ChatWidget';
import Footer from '@/components/Footer/Footer';
import MapSection from '@/components/MapSection/MapSection';
import { ReactNode } from 'react';
import HotelJsonLd from '@/components/JsonLd/HotelJsonLd';
import YandexMetrika from '@/components/YandexMetrika/YandexMetrika';
import Providers from '@/components/BookingForm/Providers';
import NextTopLoader from 'nextjs-toploader';

/**
 * Подключаем шрифт Inter.
 * - subsets: ['cyrillic', 'latin'] – поддержка кириллицы и латиницы.
 * - weight: доступные начертания.
 * - display: 'swap' – текст сразу отображается системным шрифтом, затем подменяется.
 * - variable: '--font-ui' – CSS-переменная для использования в стилях.
 */
const inter = Inter({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-ui',
});

// Базовый URL сайта (нужен для абсолютных ссылок в метаданных)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

// Значения по умолчанию, если админ ещё не заполнил соответствующие настройки.
// Намеренно generic-плейсхолдеры, не текст конкретного отеля — этот же код
// разворачивается на серверах разных заказчиков (см. миграции 005/006,
// сидящие ровно такими же плейсхолдерами), и до первого захода в SEO-админку
// сайт не должен молча показывать чужую реальную бизнес-идентичность.
// Должны совпадать с DEFAULTS.site_title/site_description в
// src/app/api/admin/seo/route.ts — то же самое значение, тот же смысл.
const DEFAULT_SITE_TITLE = 'Название вашего отеля';
const DEFAULT_SITE_DESCRIPTION =
  'Уютный отель: комфортные номера и внимательный сервис. Бронирование онлайн.';
// Прежний захардкоженный <meta name="yandex-verification">, вынесенный в
// настройки — оставлен как дефолт, чтобы подтверждение сайта в Яндексе не
// слетело сразу после деплоя, пока админ ещё не открывал SEO-настройки.
const DEFAULT_YANDEX_VERIFICATION = '0000000000000000';

/**
 * Метаданные приложения читаются из site_settings (site_title/site_description/
 * hotel_name), поэтому вычисляются асинхронно. Наследуются всеми страницами,
 * если те не переопределят их (см. generateMetadata на конкретных страницах).
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = settings.site_title || DEFAULT_SITE_TITLE;
  const description = settings.site_description || DEFAULT_SITE_DESCRIPTION;
  const hotelName = settings.hotel_name || 'Название вашего отеля';

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s | ${hotelName}`,
    },
    description,
    authors: [{ name: hotelName }],
    creator: hotelName,
    applicationName: hotelName,
    openGraph: {
      type: 'website',
      locale: 'ru_RU',
      url: SITE_URL,
      siteName: hotelName,
      title,
      description,
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: hotelName,
        },
      ],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: SITE_URL,
    },
    // logo_full ("Полный логотип" в админке, раздел «Главная») раньше нигде
    // не читался за пределами самой формы админки — админ загружал файл,
    // видел превью в форме, но реальный favicon сайта оставался
    // захардкоженным на статичные /favicon.ico и /icon.svg.
    icons: settings.logo_full
      ? {
          icon: [{ url: settings.logo_full }],
          apple: [{ url: settings.logo_full }],
        }
      : {
          icon: [
            { url: '/favicon.ico', sizes: 'any' },
            { url: '/icon.svg', type: 'image/svg+xml' },
          ],
          apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
        },
    manifest: '/manifest.webmanifest',
    verification: {
      yandex: settings.yandex_webmaster_verification || DEFAULT_YANDEX_VERIFICATION,
    },
  };
}

/**
 * Настройки viewport:
 * themeColor – цвет заголовка браузера на мобильных,
 * width/initialScale – адаптивность,
 * maximumScale – запрет масштабирования (спорно, но оставлено как в исходнике).
 */
export const viewport: Viewport = {
  themeColor: '#F5F0E8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

/**
 * Пропсы корневого layout.
 * children – основная страница,
 * modal – содержимое параллельного маршрута @modal (перехватывающие маршруты).
 */
interface RootLayoutProps{
  children: ReactNode;
  modal: ReactNode
}

/**
 * Корневой layout.
 * Внутри <html> задаём язык и класс с переменной шрифта.
 * Порядок элементов:
 * 1. NextTopLoader – прогресс-бар при навигации.
 * 2. HotelJsonLd – структурированные данные JSON-LD для SEO.
 * 3. Providers – контекст для формы бронирования.
 * 4. Header – шапка сайта.
 * 5. <main> – основной контент страницы.
 * 6. modal – перехватывающий маршрут (модалка номера).
 * 7. MapSection – блок с картой (внизу).
 * 8. Footer – подвал.
 * 9. ScrollToTop – кнопка "наверх".
 * 10. ChatWidget – чат-виджет.
 */
export default async function RootLayout({ children, modal }: RootLayoutProps) {
  const [palette, settings, pricingRules] = await Promise.all([
    getPalette(),
    getSiteSettings(),
    getPricingRules(),
  ]);
  // Значения не экранируются здесь — безопасность держится на строгой
  // серверной валидации при записи (paletteSchema в /api/admin/palette:
  // только hex-цвет или CSS-размер), а не на доверии к содержимому.
  const cssVars = Object.entries(palette)
    .map(([key, value]) => `--${key}: ${value};`)
    .join('\n');

  return (
    <html lang="ru" className={inter.variable}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `:root {\n${cssVars}\n}` }} />
      </head>
      <body>
        <NextTopLoader
          color="#173f35"          // цвет прогресс-бара
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}      // отключаем спиннер
          easing="ease"
          speed={200}
          shadow="0 0 10px #173f35,0 0 5px #173f35"
          zIndex={1600}            // выше модалок
        />
        <HotelJsonLd/>
        {settings.yandex_metrika_id && <YandexMetrika counterId={settings.yandex_metrika_id} />}
        <Providers
          pricingRules={pricingRules}
          maxGuests={pricingRules.maxGuestsAbsolute}
          totalLabel={settings.booking_total_label || undefined}
          priceHint={settings.booking_price_hint || undefined}
          formula={pricingRules.formula}
          additionalTariffs={pricingRules.additionalTariffs}
        >
          <Header
            logoTitle={settings.logo_title}
            logoSubtitle={settings.logo_subtitle}
            hotelPhone={settings.hotel_phone}
            socialMax={settings.social_max}
          />
          <main>{children}</main>
          {modal}
          <MapSection
            hotelAddress={settings.hotel_address}
            hotelPhone={settings.hotel_phone}
            hotelEmail={settings.hotel_email}
            hotelLat={settings.hotel_lat}
            hotelLon={settings.hotel_lon}
          />
          <Footer
            hotelName={settings.hotel_name}
            hotelAddress={settings.hotel_address}
            hotelPhone={settings.hotel_phone}
            hotelEmail={settings.hotel_email}
            socialVk={settings.social_vk}
            socialTelegram={settings.social_telegram}
            socialMax={settings.social_max}
            footerAbout={settings.footer_about}
            footerDisclaimer={settings.footer_disclaimer}
          />
          <ScrollToTop/>
          <ChatWidget welcomeMessage={settings.chat_welcome_message} hotelPhone={settings.hotel_phone} />
        </Providers>
      </body>
    </html>
  );
}