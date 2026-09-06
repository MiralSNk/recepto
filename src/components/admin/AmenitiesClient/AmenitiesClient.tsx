'use client';

import { useState } from 'react';
import { Amenity } from '@/types';
import { api } from '@/lib/utils/api';
import { useFileUpload } from '@/hooks';
import InlineSvgIcon from '@/components/InlineSvgIcon/InlineSvgIcon';
import './Amenities.scss';

interface AmenitiesClientProps {
  initialAmenities: Amenity[];
}

export default function AmenitiesClient({ initialAmenities }: AmenitiesClientProps) {
  const [amenities, setAmenities] = useState<Amenity[]>(initialAmenities);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Amenity | null>(null);

  const [formKey, setFormKey] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formIconUrl, setFormIconUrl] = useState<string | null>(null);
  const [formSort, setFormSort] = useState(0);
  const [fixSvgColor, setFixSvgColor] = useState(false);

  const { upload, uploading } = useFileUpload({
    onSuccess: (url) => setFormIconUrl(url),
    onError: (err) => setError(err.message),
  });

  const refresh = async () => {
    setError('');
    try {
      const data = await api.get<Amenity[]>('/api/admin/amenities');
      setAmenities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить список');
    }
  };

  const openCreateModal = () => {
    setEditing(null);
    setFormKey('');
    setFormLabel('');
    setFormIconUrl(null);
    setFormSort(0);
    setFixSvgColor(false);
    setShowModal(true);
  };

  const openEditModal = (a: Amenity) => {
    setEditing(a);
    setFormKey(a.amenity_key);
    setFormLabel(a.label);
    setFormIconUrl(a.icon_url);
    setFormSort(a.sort_order);
    setFixSvgColor(false);
    setShowModal(true);
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await upload(file, { fixSvgColor: file.type === 'image/svg+xml' && fixSvgColor });
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!formKey.trim() || !formLabel.trim()) {
      setError('Заполните ключ и название');
      return;
    }

    setError('');
    try {
      const payload = {
        amenity_key: formKey.trim(),
        label: formLabel.trim(),
        icon_url: formIconUrl,
        sort_order: formSort,
      };

      if (editing) {
        await api.put(`/api/admin/amenities/${editing.id}`, payload);
      } else {
        await api.post('/api/admin/amenities', payload);
      }

      setShowModal(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  const handleDelete = async (id: number, key: string) => {
    if (!confirm(`Удалить удобство "${key}"? Оно исчезнет из карточек номеров, которые его используют.`)) return;

    setError('');
    try {
      await api.delete(`/api/admin/amenities/${id}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  return (
    <div className="admin-amenities">
      <div className="admin-amenities__header">
        <h1>Удобства номеров</h1>
        <button className="admin-amenities__add-btn" onClick={openCreateModal}>
          + Добавить удобство
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-amenities__table-wrap">
        <table className="admin-amenities__table">
          <thead>
            <tr>
              <th>Иконка</th>
              <th>Ключ</th>
              <th>Название</th>
              <th>Порядок</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {amenities.map((a) => (
              <tr key={a.id}>
                <td>
                  {a.icon_url ? (
                    <InlineSvgIcon src={a.icon_url} className="admin-amenities__icon-preview" />
                  ) : (
                    <span className="admin-amenities__icon-default">по умолчанию</span>
                  )}
                </td>
                <td><code>{a.amenity_key}</code></td>
                <td>{a.label}</td>
                <td>{a.sort_order}</td>
                <td>
                  <button className="admin-amenities__edit" onClick={() => openEditModal(a)}>
                    ✏️
                  </button>
                  <button className="admin-amenities__delete" onClick={() => handleDelete(a.id, a.amenity_key)}>
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="admin-amenities__modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-amenities__modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Редактировать удобство' : 'Новое удобство'}</h2>
            <div className="admin-amenities__modal-fields">
              <label>
                Ключ (латиница, цифры, _ и -)
                <input
                  type="text"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  disabled={!!editing}
                  placeholder="wifi"
                />
              </label>
              <label>
                Название
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="Wi-Fi"
                />
              </label>
              <label>
                Иконка (необязательно — иначе стандартная)
                <input type="file" accept="image/svg+xml,image/png" onChange={handleIconUpload} disabled={uploading} />
                <span className="admin-amenities__field-hint">
                  Лучше загружать SVG с заливкой <code>fill=&quot;currentColor&quot;</code> вместо
                  конкретного цвета — тогда иконка сама подстроится под цветовую палитру сайта.
                  PNG тоже подойдёт, но останется одного цвета.
                </span>
              </label>
              <label className="admin-amenities__checkbox-field">
                <input
                  type="checkbox"
                  checked={fixSvgColor}
                  onChange={(e) => setFixSvgColor(e.target.checked)}
                />
                <span>
                  Если в SVG забыли <code>fill=&quot;currentColor&quot;</code> — попробовать
                  исправить автоматически при загрузке
                </span>
                <span className="admin-amenities__field-hint">
                  Заменит захардкоженный цвет заливки на currentColor во всех элементах, кроме
                  fill=&quot;none&quot; и служебных блоков (маски/градиенты). Не подходит для
                  многоцветных иконок — тогда лучше поправить SVG вручную. По умолчанию выключено.
                </span>
              </label>
              {formIconUrl && (
                <div className="admin-amenities__icon-row">
                  <InlineSvgIcon src={formIconUrl} className="admin-amenities__icon-preview" />
                  <button type="button" onClick={() => setFormIconUrl(null)}>
                    Убрать
                  </button>
                </div>
              )}
              <label>
                Порядок сортировки
                <input
                  type="number"
                  value={formSort}
                  onChange={(e) => setFormSort(Number(e.target.value))}
                  min="0"
                />
              </label>
            </div>
            <div className="admin-amenities__modal-actions">
              <button className="admin-amenities__modal-cancel" onClick={() => setShowModal(false)}>
                Отмена
              </button>
              <button className="admin-amenities__modal-save" onClick={handleSave} disabled={uploading}>
                {editing ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
