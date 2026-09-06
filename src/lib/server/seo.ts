/**
 * Чтение публичных/SEO настроек отеля из site_settings.
 */
import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getDB } from '@/db';
import { buildSafe } from './build-safe';

const SITE_SETTING_KEYS = [
  'hotel_name',
  'hotel_address',
  'hotel_phone',
  'hotel_email',
  'hotel_rating',
  'hotel_lat',
  'hotel_lon',
  'seo_home_title',
  'seo_home_description',
  'og_home_title',
  'og_home_description',
  'og_home_image',
  'seo_contacts_title',
  'seo_contacts_description',
  'og_contacts_title',
  'og_contacts_description',
  'og_contacts_image',
  'seo_privacy_title',
  'seo_privacy_description',
  'og_privacy_title',
  'og_privacy_description',
  'og_privacy_image',
  'logo_title',
  'logo_subtitle',
  'logo_full',
  'hero_bg',
  'hero_title',
  'hero_subtitle',
  'social_vk',
  'social_telegram',
  'social_max',
  'footer_about',
  'footer_disclaimer',
  'site_title',
  'site_description',
  'chat_welcome_message',
  'about_page_content',
  'yandex_webmaster_verification',
  'yandex_metrika_id',
  'child_free_age_limit',
  'max_guests_absolute',
  'calculator_formula',
  'room_capacity_heading',
  'room_price_note',
  'booking_total_label',
  'booking_price_hint',
] as const;

export type SiteSettingsKey = (typeof SITE_SETTING_KEYS)[number];
export type SiteSettings = Record<SiteSettingsKey, string>;

function emptySettings(): SiteSettings {
  const settings = {} as SiteSettings;
  for (const key of SITE_SETTING_KEYS) settings[key] = '';
  return settings;
}

// Кэш между запросами (тег 'seo'/'home' — их уже инвалидируют соответствующие
// admin-роуты при сохранении) + cache() для дедупликации внутри одного
// рендера/вызова (например generateMetadata и тело страницы, или несколько
// обращений за один HTTP-запрос к /api/chat).
export const getSiteSettings = cache(
  unstable_cache(
    async (): Promise<SiteSettings> =>
      buildSafe(async () => {
        const db = getDB();
        const raw = await db.siteSettings.getSettings([...SITE_SETTING_KEYS]);

        const settings = {} as SiteSettings;
        for (const key of SITE_SETTING_KEYS) {
          const value = raw[key];
          settings[key] = typeof value === 'string' ? value : '';
        }
        return settings;
      }, emptySettings()),
    ['site-settings'],
    { tags: ['seo', 'home'] }
  )
);

export { phoneToTelHref } from '@/lib/utils/phone';