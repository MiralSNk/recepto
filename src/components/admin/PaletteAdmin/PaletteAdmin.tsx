'use client';

import { useEffect, useState } from 'react';
import './PaletteAdmin.scss';

interface PaletteItem {
  key: string;
  label: string;
  value: string;
}

const DEFAULT_ITEMS: PaletteItem[] = [
  { key: 'color-pr-gold', label: 'Акцентный цвет', value: '#89754f' },
  { key: 'color-pr-brown', label: 'Цвет кнопок и акцентов', value: '#173f35' },
  { key: 'color-pr-warm', label: 'Цвет тёплых плашек', value: '#F5F0E8' },
  { key: 'color-cream', label: 'Основной фон', value: '#ebe1c9' },
  { key: 'color-white', label: 'Фон карточек', value: '#FFFFFF' },
  { key: 'color-dark', label: 'Цвет сильного контраста', value: '#000000' },
  { key: 'color-text-primary', label: 'Основной текст', value: '#111111' },
  { key: 'color-text-inverse', label: 'Текст на тёмном фоне', value: '#FFFFFF' },
  { key: 'color-text-muted', label: 'Приглушённый текст', value: '#555555' },
  { key: 'color-logo-title-transparent', label: 'Логотип, название — ДО скролла (шапка поверх фото)', value: '#FFFFFF' },
  { key: 'color-logo-subtitle-transparent', label: 'Логотип, подпись — ДО скролла (шапка поверх фото)', value: '#F2F2F2' },
  { key: 'color-logo-title', label: 'Логотип, название — ПОСЛЕ скролла (шапка с фоном)', value: '#111111' },
  { key: 'color-logo-subtitle', label: 'Логотип, подпись — ПОСЛЕ скролла (шапка с фоном)', value: '#555555' },
  { key: 'radius-sm', label: 'Радиус маленький', value: '6px' },
  { key: 'radius-md', label: 'Радиус средний', value: '10px' },
  { key: 'radius-lg', label: 'Радиус большой', value: '16px' },
  { key: 'radius-full', label: 'Радиус круглый', value: '9999px' },
  { key: 'spacing-unit', label: 'Отступ (базовый)', value: '8px' },
];

export default function PaletteAdmin() {
  const [items, setItems] = useState<PaletteItem[]>(DEFAULT_ITEMS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/palette')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === 'object') {
          const loaded = DEFAULT_ITEMS.map((item) => ({
            ...item,
            value: data[item.key] || item.value,
          }));
          setItems(loaded);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, value } : item))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = items.reduce<Record<string, string>>((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {});

      const res = await fetch('/api/admin/palette', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      alert('Палитра сохранена!');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  // Определяем, является ли поле цветом (для отображения color input)
  const showColorPicker = (key: string) =>
    key.startsWith('color-') && !key.startsWith('radius') && key !== 'spacing-unit';

  if (loading) return <div className="palette-admin__loading">Загрузка...</div>;

  return (
    <div className="palette-admin">
      <h1 className="palette-admin__title">Цветовая палитра</h1>
      <div className="palette-admin__grid">
        {items.map((item) => (
          <div key={item.key} className="palette-admin__item">
            <label className="palette-admin__label">
              <span>{item.label}</span>
              <div className="palette-admin__row">
                {showColorPicker(item.key) && (
                  <input
                    type="color"
                    value={item.value.startsWith('#') ? item.value : '#000000'}
                    onChange={(e) => handleChange(item.key, e.target.value)}
                    className="palette-admin__color-input"
                  />
                )}
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => handleChange(item.key, e.target.value)}
                  className="palette-admin__text-input"
                />
              </div>
            </label>
          </div>
        ))}
      </div>
      <button
        className="palette-admin__save-btn"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Сохранение...' : 'Сохранить палитру'}
      </button>
    </div>
  );
}