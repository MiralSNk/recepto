'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/utils/api';
import TariffCatalog from '../TariffsAdminClient/TariffCatalog';
import FormulaConstructor from '../TariffsAdminClient/FormulaConstructor';
import '../SeoAdminClient/SeoAdminClient.scss';

const LABELS: Record<string, string> = {
  child_free_age_limit: 'Дети бесплатно и не считаются гостем до (лет)',
  max_guests_absolute: 'Максимум гостей в брони',
  room_capacity_heading: 'Заголовок вместимости в карточке номера',
  room_price_note: 'Пояснение под вместимостью в карточке номера',
  booking_total_label: 'Название итоговой строки в форме бронирования',
  booking_price_hint: 'Пояснение под ценой в форме бронирования',
};

const TEXT_KEYS = new Set([
  'room_capacity_heading',
  'room_price_note',
  'booking_total_label',
  'booking_price_hint',
]);

const KEYS = Object.keys(LABELS);

export default function PricingAdminClient() {
  const [items, setItems] = useState<Record<string, { value: string; description: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api
      .get<Record<string, { value: string; description: string }>>('/api/admin/pricing')
      .then(setItems)
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setItems((prev) => ({ ...prev, [key]: { ...prev[key], value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const payload: Record<string, string> = {};
      Object.entries(items).forEach(([key, item]) => {
        payload[key] = String(item.value);
      });
      const data = await api.put<{ message?: string }>('/api/admin/pricing', payload);
      setMessage(data.message || 'Настройки сохранены');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="seo-admin__loading">Загрузка...</div>;
  if (loadError) return <div className="seo-admin__error">{loadError}</div>;

  return (
    <div className="seo-admin">
      <h1 className="seo-admin__title">Тарифы</h1>
      <p className="seo-admin__hint">
        Глобальные правила расчёта стоимости брони за одну ночь: возрастной порог для детей
        и доплата за 2-го и каждого следующего гостя. Применяются сразу на сайте — без пересборки.
      </p>

      <section className="seo-admin__section">
        <div className="seo-admin__list">
          {KEYS.map((key) => {
            const item = items[key];
            const valueStr = String(item?.value ?? '');
            return (
              <div key={key} className="seo-admin__row">
                <div className="seo-admin__info">
                  <strong>{LABELS[key]}</strong>
                  <span>{item?.description || ''}</span>
                </div>
                <div className="seo-admin__control">
                  {TEXT_KEYS.has(key) ? (
                    <input
                      type="text"
                      maxLength={300}
                      value={valueStr}
                      onChange={(e) => handleChange(key, e.target.value)}
                    />
                  ) : (
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      value={valueStr}
                      onChange={(e) => handleChange(key, e.target.value)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <button className="seo-admin__save-btn" onClick={handleSave} disabled={saving}>
        {saving ? 'Сохранение...' : 'Сохранить изменения'}
      </button>

      {message && <p className="seo-admin__message">{message}</p>}

      <TariffCatalog />
      <FormulaConstructor />
    </div>
  );
}
