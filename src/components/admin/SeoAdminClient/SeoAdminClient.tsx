'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/utils/api';
import { extractCoordsFromYandexMapsLink } from '@/lib/shared/yandex-maps';
import './SeoAdminClient.scss';

interface SeoItem {
  key: string;
  value: string | number;
  description: string;
}

const MULTILINE_KEYS = new Set(['footer_about', 'footer_disclaimer', 'about_page_content', 'chat_welcome_message']);

// Если поле в БД ещё пустое, показываем не голый инпут, а осмысленное
// значение для старта — отредактировать привычнее, чем печатать с нуля.
// Сохранится в БД, только если админ реально нажмёт «Сохранить изменения».
const PREFILL_DEFAULTS: Record<string, string> = {
  social_vk: 'https://vk.ru/example',
  social_telegram: 'https://t.me/+70000000000',
  social_max: 'max://chat',
};

// Понятные пользователю названия полей вместо технических ключей БД.
const LABELS: Record<string, string> = {
  hotel_name: 'Название отеля',
  hotel_address: 'Адрес',
  hotel_phone: 'Телефон',
  hotel_email: 'Email',
  hotel_rating: 'Звёздность (1–5)',
  hotel_lat: 'Широта',
  hotel_lon: 'Долгота',
  social_vk: 'Ссылка ВКонтакте',
  social_telegram: 'Ссылка Telegram',
  social_max: 'Ссылка MAX',
  site_title: 'Заголовок сайта по умолчанию',
  site_description: 'Описание сайта по умолчанию',
  footer_about: 'Текст «О гостинице» в подвале',
  footer_disclaimer: 'Дисклеймер в подвале',
  chat_welcome_message: 'Приветствие в чат-помощнике',
  about_page_content: 'Текст страницы «Об отеле»',
  seo_home_title: 'Заголовок для поиска — главная',
  seo_home_description: 'Описание для поиска — главная',
  seo_contacts_title: 'Заголовок для поиска — «Об отеле»',
  seo_contacts_description: 'Описание для поиска — «Об отеле»',
  seo_privacy_title: 'Заголовок для поиска — «Политика»',
  seo_privacy_description: 'Описание для поиска — «Политика»',
  og_home_title: 'Заголовок превью в соцсетях — главная',
  og_home_description: 'Описание превью в соцсетях — главная',
  og_home_image: 'Картинка превью — главная',
  og_contacts_title: 'Заголовок превью в соцсетях — «Об отеле»',
  og_contacts_description: 'Описание превью в соцсетях — «Об отеле»',
  og_contacts_image: 'Картинка превью — «Об отеле»',
  og_privacy_title: 'Заголовок превью в соцсетях — «Политика»',
  og_privacy_description: 'Описание превью в соцсетях — «Политика»',
  og_privacy_image: 'Картинка превью — «Политика»',
  yandex_webmaster_verification: 'Код подтверждения в Яндекс.Вебмастере',
  yandex_metrika_id: 'Номер счётчика Яндекс.Метрики',
};

const SEO_GROUPS = [
  {
    title: 'Основные данные отеля',
    keys: ['hotel_name', 'hotel_address', 'hotel_phone', 'hotel_email', 'hotel_rating', 'hotel_lat', 'hotel_lon'],
  },
  {
    title: 'Соцсети и подвал сайта',
    keys: ['social_vk', 'social_telegram', 'social_max', 'footer_about', 'footer_disclaimer'],
  },
  {
    title: 'Контент сайта',
    keys: ['site_title', 'site_description', 'about_page_content', 'chat_welcome_message'],
  },
  {
    title: 'Главная страница',
    keys: ['seo_home_title', 'seo_home_description', 'og_home_title', 'og_home_description', 'og_home_image'],
  },
  {
    title: 'Страница «Об отеле»',
    keys: ['seo_contacts_title', 'seo_contacts_description', 'og_contacts_title', 'og_contacts_description', 'og_contacts_image'],
  },
  {
    title: 'Яндекс: подтверждение сайта и аналитика',
    keys: ['yandex_webmaster_verification', 'yandex_metrika_id'],
  },
  {
    title: 'Страница «Политика конфиденциальности»',
    keys: ['seo_privacy_title', 'seo_privacy_description', 'og_privacy_title', 'og_privacy_description', 'og_privacy_image'],
  },
];

export default function SeoAdminClient() {
  const [items, setItems] = useState<Record<string, { value: string | number; description: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [mapLink, setMapLink] = useState('');

  useEffect(() => {
    api
      .get<Record<string, { value: string | number; description: string }>>('/api/admin/seo')
      .then((data) => {
        const withDefaults = { ...data };
        for (const [key, defaultValue] of Object.entries(PREFILL_DEFAULTS)) {
          const current = withDefaults[key];
          if (!current || !String(current.value ?? '').trim()) {
            withDefaults[key] = { ...current, value: defaultValue };
          }
        }
        setItems(withDefaults);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string | number) => {
    setItems((prev) => ({
      ...prev,
      [key]: { ...prev[key], value },
    }));
  };

  const handleExtractCoords = () => {
    const coords = extractCoordsFromYandexMapsLink(mapLink);
    if (!coords) {
      alert('Не удалось извлечь координаты из ссылки');
      return;
    }
    handleChange('hotel_lat', String(coords.lat));
    handleChange('hotel_lon', String(coords.lon));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const payload: Record<string, string> = {};
      Object.entries(items).forEach(([key, item]) => {
        payload[key] = String(item.value);
      });
      const data = await api.put<{ message?: string }>('/api/admin/seo', payload);
      setMessage(data.message || 'Настройки сохранены');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="seo-admin">
      <h1 className="seo-admin__title">SEO и контактные данные</h1>
      <p className="seo-admin__hint">
        Ниже — текущие значения. Чтобы изменить, отредактируйте нужное поле и нажмите «Сохранить
        изменения» внизу страницы.
      </p>

      {SEO_GROUPS.map((group) => (
        <section key={group.title} className="seo-admin__section">
          <h2 className="seo-admin__section-title">{group.title}</h2>
          <div className="seo-admin__list">
            {group.keys.map((key) => {
              const item = items[key];
              const valueStr = String(item?.value ?? '');
              return (
                <div key={key}>
                  {key === 'hotel_lat' && (
                    <div className="seo-admin__row">
                      <div className="seo-admin__info">
                        <strong>Ссылка на Яндекс.Карты</strong>
                        <span>
                          Вставьте ссылку на отель в Яндекс.Картах — широта и долгота ниже
                          посчитаются сами (правой кнопкой по зданию на карте — «Поделиться» —
                          скопировать ссылку).
                        </span>
                      </div>
                      <div className="seo-admin__control seo-admin__maplink-control">
                        <input
                          type="text"
                          value={mapLink}
                          onChange={(e) => setMapLink(e.target.value)}
                          placeholder="https://yandex.ru/maps/?ll=39.7184,47.2182"
                        />
                        <button type="button" onClick={handleExtractCoords}>
                          Заполнить координаты
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="seo-admin__row">
                    <div className="seo-admin__info">
                      <strong>{LABELS[key] || key}</strong>
                      <span>{item?.description || ''}</span>
                    </div>
                    <div className="seo-admin__control">
                      {key === 'hotel_rating' ? (
                        <input
                          type="number"
                          min="1"
                          max="5"
                          step="0.1"
                          value={valueStr}
                          onChange={(e) => handleChange(key, e.target.value)}
                        />
                      ) : key === 'hotel_lat' || key === 'hotel_lon' ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={valueStr}
                          onChange={(e) => handleChange(key, e.target.value)}
                        />
                      ) : MULTILINE_KEYS.has(key) ? (
                        <textarea
                          rows={key === 'about_page_content' ? 8 : 3}
                          value={valueStr}
                          onChange={(e) => handleChange(key, e.target.value)}
                        />
                      ) : (
                        <input
                          type="text"
                          value={valueStr}
                          onChange={(e) => handleChange(key, e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <button className="seo-admin__save-btn" onClick={handleSave} disabled={saving}>
        {saving ? 'Сохранение...' : 'Сохранить изменения'}
      </button>

      {message && <p className="seo-admin__message">{message}</p>}
    </div>
  );
}