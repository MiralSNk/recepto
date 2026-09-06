'use client';

import { useState, useEffect } from 'react';
import { extractCoordsFromYandexMapsLink } from '@/lib/shared/yandex-maps';

/**
 * Модальное окно для добавления/редактирования места.
 * Поддерживает извлечение координат из ссылки Яндекс.Карт.
 */
interface Place {
  id: number;
  name: string;
  category_key: string;
  lat: number;
  lon: number;
  description: string;
  sort_order: number;
  is_visible: boolean;
}

interface PlaceModalProps {
  isOpen: boolean;
  editingPlace: Place | null;
  categories: { key: string; label: string }[];
  onClose: () => void;
  onSubmit: (data: Omit<Place, 'id'>) => void;
}

export default function PlaceModal({
  isOpen,
  editingPlace,
  categories,
  onClose,
  onSubmit,
}: PlaceModalProps) {
  const [form, setForm] = useState({
    name: '',
    category_key: categories[0]?.key || '',
    lat: '',
    lon: '',
    description: '',
    sort_order: '0',
    is_visible: true,
  });
  const [mapLink, setMapLink] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingPlace) {
        setForm({
          name: editingPlace.name,
          category_key: editingPlace.category_key,
          lat: String(editingPlace.lat),
          lon: String(editingPlace.lon),
          description: editingPlace.description,
          sort_order: String(editingPlace.sort_order),
          is_visible: editingPlace.is_visible,
        });
      } else {
        setForm({
          name: '',
          category_key: categories[0]?.key || '',
          lat: '',
          lon: '',
          description: '',
          sort_order: '0',
          is_visible: true,
        });
      }
      setMapLink('');
    }
  }, [isOpen, editingPlace, categories]);

  const handleExtract = () => {
    const coords = extractCoordsFromYandexMapsLink(mapLink);
    if (coords) {
      setForm((prev) => ({
        ...prev,
        lat: String(coords.lat),
        lon: String(coords.lon),
      }));
    } else {
      alert('Не удалось извлечь координаты');
    }
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.description.trim()) {
      alert('Заполните название и описание');
      return;
    }
    const lat = parseFloat(form.lat);
    const lon = parseFloat(form.lon);
    if (isNaN(lat) || isNaN(lon)) {
      alert('Введите корректные координаты');
      return;
    }

    onSubmit({
      name: form.name,
      category_key: form.category_key,
      lat,
      lon,
      description: form.description,
      sort_order: Number(form.sort_order) || 0,
      is_visible: form.is_visible,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="admin-chat__modal-overlay" onClick={onClose}>
      <div
        className="admin-chat__modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{editingPlace ? 'Редактировать место' : 'Новое место'}</h2>
        <div className="admin-chat__modal-fields">
          <label>
            Название
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Например, Гастрономъ"
            />
          </label>
          <label>
            Категория
            <select
              value={form.category_key}
              onChange={(e) =>
                setForm({ ...form, category_key: e.target.value })
              }
            >
              {categories.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ссылка на Яндекс.Карты (для автозаполнения)
            <input
              type="text"
              value={mapLink}
              onChange={(e) => setMapLink(e.target.value)}
              placeholder="https://yandex.ru/maps/?ll=39.7184,47.2182"
            />
          </label>
          <button
            type="button"
            className="admin-chat__extract-btn"
            onClick={handleExtract}
          >
            Заполнить координаты из ссылки
          </button>
          <div className="admin-chat__modal-row">
            <label>
              Широта (lat)
              <input
                type="text"
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
                placeholder="47.2182"
              />
            </label>
            <label>
              Долгота (lon)
              <input
                type="text"
                value={form.lon}
                onChange={(e) => setForm({ ...form, lon: e.target.value })}
                placeholder="39.7184"
              />
            </label>
          </div>
          <label>
            Описание
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="ул. Береговая, 100 м"
            />
          </label>
          <label>
            Порядок сортировки
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              min="0"
            />
          </label>
          <label className="admin-chat__checkbox">
            <input
              type="checkbox"
              checked={form.is_visible}
              onChange={(e) =>
                setForm({ ...form, is_visible: e.target.checked })
              }
            />
            Показывать на сайте
          </label>
        </div>
        <div className="admin-chat__modal-actions">
          <button className="admin-chat__modal-cancel" onClick={onClose}>
            Отмена
          </button>
          <button className="admin-chat__modal-save" onClick={handleSubmit}>
            {editingPlace ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  );
}