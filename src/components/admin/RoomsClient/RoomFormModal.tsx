'use client';

import { useEffect, useState } from 'react';
import {
  AdminCategory,
  AdminRoom,
  AdminRoomCreate,
  Amenity,
  CategoryKey,
  AmenityKey,
  Tariff,
  RoomTariffInput,
} from '@/types';
import { useFileUpload } from '@/hooks';
import { api } from '@/lib/utils/api';

interface RoomFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingRoom: AdminRoom | null;
  categories: AdminCategory[];
}

const emptyForm = (categories: AdminCategory[]): AdminRoomCreate => ({
  name: '',
  category_key: (categories[0]?.key as CategoryKey) || 'standard',
  price: 2500,
  old_price: null,
  price_day: 2500,
  price_half_day: null,
  price_label: '',
  price_day_label: '',
  price_half_day_label: '',
  area: null,
  guests: 1,
  extra_guest_capacity: 0,
  description: '',
  full_description: '',
  is_published: true,
  sort_order: 0,
  amenities: [],
  extras: [],
  images: [],
  tariffs: [],
});

function toNullNum(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function RoomFormModal({
  isOpen,
  onClose,
  editingRoom,
  categories,
}: RoomFormModalProps) {
  const [formData, setFormData] = useState<AdminRoomCreate>(emptyForm(categories));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [amenityOptions, setAmenityOptions] = useState<Amenity[]>([]);
  const [tariffOptions, setTariffOptions] = useState<Tariff[]>([]);
  const { upload, uploading } = useFileUpload({
    type: 'rooms',
    roomId: editingRoom ? String(editingRoom.id) : 'tmp',
    onSuccess: (url) => {
      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), url],
      }));
    },
    onError: (err) => setError(err.message),
  });

  useEffect(() => {
    if (!isOpen) return;
    api
      .get<Amenity[]>('/api/admin/amenities')
      .then(setAmenityOptions)
      .catch(() => setAmenityOptions([]));
    api
      .get<Tariff[]>('/api/admin/tariffs')
      .then(setTariffOptions)
      .catch(() => setTariffOptions([]));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingRoom) {
      // roomTariffs (read-форма: label/price резолвлены из каталога) не
      // совпадает по форме с tariffs (write-форма: только tariff_id +
      // custom_label) — просто заспреженный editingRoom дал бы неверную
      // форму, поэтому конвертируем явно.
      const tariffs: RoomTariffInput[] = editingRoom.roomTariffs.map((rt) => ({
        tariff_id: rt.tariff_id,
        custom_label: rt.custom_label,
      }));
      setFormData({ ...editingRoom, tariffs } as AdminRoomCreate);
    } else {
      setFormData(emptyForm(categories));
    }
  }, [editingRoom, categories, isOpen]);

  const patch = <K extends keyof AdminRoomCreate>(key: K, value: AdminRoomCreate[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleAmenity = (key: string) => {
    const current = formData.amenities || [];
    const updated = current.includes(key as AmenityKey)
      ? current.filter((k) => k !== key)
      : [...current, key as AmenityKey];
    patch('amenities', updated);
  };

  const toggleTariff = (tariff: Tariff) => {
    const current = formData.tariffs || [];
    const attached = current.find((t) => t.tariff_id === tariff.id);
    if (attached) {
      patch('tariffs', current.filter((t) => t.tariff_id !== tariff.id));
    } else {
      patch('tariffs', [...current, { tariff_id: tariff.id, custom_label: tariff.label }]);
    }
  };

  const updateTariffLabel = (tariffId: number, customLabel: string) => {
    patch(
      'tariffs',
      (formData.tariffs || []).map((t) =>
        t.tariff_id === tariffId ? { ...t, custom_label: customLabel } : t
      )
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      await upload(file);
    }
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index),
    }));
  };

  const moveImage = (index: number, dir: -1 | 1) => {
    setFormData((prev) => {
      const imgs = [...(prev.images || [])];
      const j = index + dir;
      if (j < 0 || j >= imgs.length) return prev;
      [imgs[index], imgs[j]] = [imgs[j], imgs[index]];
      return { ...prev, images: imgs };
    });
  };

  const handleSubmit = async () => {
    const priceNum = toNullNum(formData.price);
    if (priceNum === null || priceNum < 1) {
      setError('Укажите цену (основную) больше 0');
      return;
    }

    const priceDayNum = toNullNum(formData.price_day);
    if (priceDayNum === null || priceDayNum < 1) {
      setError('Укажите цену за сутки больше 0');
      return;
    }

    let guestsNum = toNullNum(formData.guests);
    if (guestsNum === null || guestsNum < 1) guestsNum = 1;

    const payload = {
      ...formData,
      price: priceNum,
      price_day: priceDayNum,
      guests: guestsNum,
      extra_guest_capacity: toNullNum(formData.extra_guest_capacity) ?? 0,
      price_label: formData.price_label?.trim() || null,
      price_day_label: formData.price_day_label?.trim() || null,
      price_half_day_label: formData.price_half_day_label?.trim() || null,
    };

    if (!payload.name || !payload.description || !payload.full_description) {
      setError('Заполните название и оба описания');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingRoom) {
        await api.put(`/api/admin/rooms/${editingRoom.id}`, payload);
      } else {
        await api.post('/api/admin/rooms', payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-rooms__modal-overlay" onClick={onClose}>
      <div
        className="admin-rooms__modal admin-rooms__modal--large"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{editingRoom ? 'Редактировать номер' : 'Новый номер'}</h2>

        {error && <p className="admin-rooms__form-error">{error}</p>}

        <div className="admin-rooms__modal-grid">
          <div className="admin-rooms__modal-col">
            <label>
              Название *
              <input
                type="text"
                value={formData.name}
                onChange={(e) => patch('name', e.target.value)}
              />
            </label>
            <label>
              Категория *
              <select
                value={formData.category_key}
                onChange={(e) => patch('category_key', e.target.value as CategoryKey)}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.key}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Цена (основная) *
              <input
                type="text"
                inputMode="numeric"
                value={formData.price || ''}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d]/g, '');
                  patch('price', v === '' ? 0 : Number(v));
                }}
              />
              <span className="admin-rooms__field-hint">
                Показывается только на карточках номеров — на главной странице и в списке
                номеров категории. Независима от «Цены за сутки» ниже.
              </span>
            </label>
            <label>
              Цена за сутки *
              <input
                type="text"
                inputMode="numeric"
                value={formData.price_day || ''}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d]/g, '');
                  // price_day теперь не может быть null (это единственная
                  // цена номера) — 0 как временное состояние "поле очищено
                  // при наборе", handleSubmit не даст сохранить с 0.
                  patch('price_day', v === '' ? 0 : Number(v));
                }}
              />
              <span className="admin-rooms__field-hint">
                Показывается в подробной информации о номере, в форме бронирования и
                ответе ИИ-помощника.
              </span>
            </label>
            <label>
              Старая цена
              <input
                type="number"
                value={formData.old_price ?? ''}
                onChange={(e) =>
                  patch('old_price', e.target.value === '' ? null : Number(e.target.value))
                }
              />
            </label>
            <label>
              Цена за 12 часов
              <input
                type="number"
                value={formData.price_half_day ?? ''}
                onChange={(e) =>
                  patch('price_half_day', e.target.value === '' ? null : Number(e.target.value))
                }
              />
            </label>
            <label>
              Надпись цены (карточка)
              <input
                type="text"
                value={formData.price_label || 'от {price} / ночь'}
                onChange={(e) => patch('price_label', e.target.value)}
              />
              <span className="admin-rooms__field-hint">
                Вместо суммы впишите {'{price}'} — она сама подставится из поля «Цена
                (основная)» и будет обновляться при изменении цены.
              </span>
            </label>
            <label>
              Надпись «За сутки»
              <input
                type="text"
                value={formData.price_day_label || ''}
                onChange={(e) => patch('price_day_label', e.target.value)}
                placeholder="За сутки"
              />
            </label>
            <label>
              Надпись «12 часов»
              <input
                type="text"
                value={formData.price_half_day_label || ''}
                onChange={(e) => patch('price_half_day_label', e.target.value)}
                placeholder="12 часов"
              />
            </label>
          </div>

          <div className="admin-rooms__modal-col">
            <label>
              Площадь (м²)
              <input
                type="number"
                value={formData.area ?? ''}
                onChange={(e) =>
                  patch('area', e.target.value === '' ? null : Number(e.target.value))
                }
              />
            </label>
            <label>
              Макс. гостей (база)
              <input
                type="number"
                min={1}
                value={formData.guests ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value);
                  if (val !== null && val < 1) return;
                  patch('guests', val);
                }}
              />
            </label>
            <label>
              Доп. места (сверх базы, платные)
              <input
                type="number"
                min={0}
                max={20}
                value={formData.extra_guest_capacity ?? 0}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                  if (val < 0) return;
                  patch('extra_guest_capacity', val);
                }}
              />
            </label>
            <label>
              Краткое описание *
              <textarea
                value={formData.description}
                onChange={(e) => patch('description', e.target.value)}
                rows={2}
              />
            </label>
            <label>
              Полное описание *
              <textarea
                value={formData.full_description}
                onChange={(e) => patch('full_description', e.target.value)}
                rows={4}
              />
            </label>
            <div className="admin-rooms__amenities">
              <span>Удобства</span>
              <div className="admin-rooms__amenities-checkboxes">
                {amenityOptions.map((amenity) => (
                  <label key={amenity.id} className="admin-rooms__amenity-checkbox">
                    <input
                      type="checkbox"
                      checked={(formData.amenities || []).includes(amenity.amenity_key as AmenityKey)}
                      onChange={() => toggleAmenity(amenity.amenity_key)}
                    />
                    {amenity.label}
                  </label>
                ))}
                {amenityOptions.length === 0 && (
                  <span className="admin-rooms__amenities-empty">
                    Список удобств пуст — добавьте их в разделе «Удобства».
                  </span>
                )}
              </div>
            </div>
            <label>
              Доп. услуги (с новой строки)
              <textarea
                value={(formData.extras || []).join('\n')}
                onChange={(e) =>
                  patch(
                    'extras',
                    e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
                rows={3}
              />
            </label>
            <div className="admin-rooms__tariffs">
              <span>Доп. услуги с фиксированной ценой (из «Тарифы»)</span>
              <div className="admin-rooms__tariffs-list">
                {tariffOptions.map((tariff) => {
                  const attached = (formData.tariffs || []).find((t) => t.tariff_id === tariff.id);
                  return (
                    <div key={tariff.id} className="admin-rooms__tariff-row">
                      <label className="admin-rooms__amenity-checkbox">
                        <input
                          type="checkbox"
                          checked={!!attached}
                          onChange={() => toggleTariff(tariff)}
                        />
                        {tariff.label}
                      </label>
                      {attached && (
                        <>
                          <input
                            type="text"
                            className="admin-rooms__tariff-label-input"
                            value={attached.custom_label}
                            placeholder={tariff.label}
                            onChange={(e) => updateTariffLabel(tariff.id, e.target.value)}
                          />
                          <span className="admin-rooms__tariff-price-tag">
                            {tariff.price.toLocaleString('ru-RU')} ₽
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
                {tariffOptions.length === 0 && (
                  <span className="admin-rooms__amenities-empty">
                    Список тарифов пуст — добавьте их в разделе «Тарифы».
                  </span>
                )}
              </div>
              <span className="admin-rooms__field-hint">
                Текст редактируется отдельно для каждого номера, цена — всегда из «Тарифы» и
                здесь не редактируется.
              </span>
            </div>
            <label className="admin-rooms__modal-checkbox">
              <input
                type="checkbox"
                checked={!!formData.is_published}
                onChange={(e) => patch('is_published', e.target.checked)}
              />
              Опубликован
            </label>
            <label>
              Порядок
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => patch('sort_order', Number(e.target.value) || 0)}
              />
            </label>
          </div>
        </div>

        <div className="admin-rooms__photos">
          <h3>Фотографии</h3>
          <label className="admin-rooms__upload">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
              disabled={uploading}
            />
            <span>{uploading ? 'Загрузка…' : 'Добавить фото'}</span>
          </label>

          <div className="admin-rooms__photos-grid">
            {(formData.images || []).map((src, idx) => (
              <div key={`${src}-${idx}`} className="admin-rooms__photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" />
                <div className="admin-rooms__photo-actions">
                  <button type="button" onClick={() => moveImage(idx, -1)} title="Влево">
                    ←
                  </button>
                  <button type="button" onClick={() => moveImage(idx, 1)} title="Вправо">
                    →
                  </button>
                  <button type="button" onClick={() => removeImage(idx)} title="Удалить">
                    ×
                  </button>
                </div>
                {idx === 0 && <span className="admin-rooms__photo-cover">Обложка</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="admin-rooms__modal-actions">
          <button
            type="button"
            className="admin-rooms__modal-cancel"
            onClick={onClose}
            disabled={saving}
          >
            Отмена
          </button>
          <button
            type="button"
            className="admin-rooms__modal-save"
            onClick={handleSubmit}
            disabled={saving || uploading}
          >
            {saving ? 'Сохранение…' : editingRoom ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
}
