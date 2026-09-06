'use client';

import { useState } from 'react';
import { AdminCategory } from '@/types';
import { api } from '@/lib/utils/api';

interface BulkPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: AdminCategory[];
}

export default function BulkPriceModal({
  isOpen,
  onClose,
  categories,
}: BulkPriceModalProps) {
  const [categoryKey, setCategoryKey] = useState('');
  const [priceDay, setPriceDay] = useState('');
  const [priceHalf, setPriceHalf] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!categoryKey) {
      alert('Выберите категорию');
      return;
    }

    const payload: Record<string, string | number> = { categoryKey };

    if (priceDay.trim() !== '') {
      const n = Number(priceDay);
      if (!Number.isFinite(n) || n < 1) {
        alert('Некорректная цена за сутки');
        return;
      }
      payload.price_day = n;
    }
    if (priceHalf.trim() !== '') {
      const n = Number(priceHalf);
      if (!Number.isFinite(n) || n < 1) {
        alert('Некорректная цена за 12 часов');
        return;
      }
      payload.price_half_day = n;
    }

    if (Object.keys(payload).length <= 1) {
      alert('Укажите хотя бы одну цену');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post<{ updated?: number }>('/api/admin/rooms/bulk-price', payload);
      alert(`Обновлено номеров: ${data.updated ?? '—'}`);
      setCategoryKey('');
      setPriceDay('');
      setPriceHalf('');
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка массового обновления');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-rooms__modal-overlay" onClick={onClose}>
      <div className="admin-rooms__modal" onClick={(e) => e.stopPropagation()}>
        <h2>Массовое обновление цен</h2>
        <div className="admin-rooms__modal-fields">
          <label>
            Категория *
            <select
              value={categoryKey}
              onChange={(e) => setCategoryKey(e.target.value)}
            >
              <option value="">Выберите категорию</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Цена за сутки
            <input
              type="number"
              value={priceDay}
              onChange={(e) => setPriceDay(e.target.value)}
              placeholder="Пусто = не менять"
            />
          </label>
          <label>
            Цена за 12 часов
            <input
              type="number"
              value={priceHalf}
              onChange={(e) => setPriceHalf(e.target.value)}
              placeholder="Пусто = не менять"
            />
          </label>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
            Пустое поле не изменяет значение в базе. Цена за сутки показывается в
            подробной информации о номере, в форме бронирования и ИИ-помощнику. «Цену
            (основная)», которая на карточках номеров, массово изменить нельзя —
            только по одному номеру.
          </p>
        </div>
        <div className="admin-rooms__modal-actions">
          <button
            type="button"
            className="admin-rooms__modal-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Отмена
          </button>
          <button
            type="button"
            className="admin-rooms__modal-save"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Обновление…' : 'Обновить'}
          </button>
        </div>
      </div>
    </div>
  );
}