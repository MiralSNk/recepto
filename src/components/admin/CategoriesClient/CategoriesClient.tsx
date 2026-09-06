'use client';

import { useState } from 'react';
import { AdminCategory } from '@/types';
import { api } from '@/lib/utils/api';
import './Categories.scss';

interface CategoriesClientProps {
  initialCategories: AdminCategory[];
}

export default function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const [categories, setCategories] = useState<AdminCategory[]>(initialCategories);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);

  const [formKey, setFormKey] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formVisible, setFormVisible] = useState(true);
  const [formSort, setFormSort] = useState(0);
  const [formMaxGuests, setFormMaxGuests] = useState('');

  // Загрузка списка категорий
  const refreshCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<AdminCategory[]>('/api/admin/categories');
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить список');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormKey('');
    setFormLabel('');
    setFormVisible(true);
    setFormSort(0);
    setFormMaxGuests('');
    setShowModal(true);
  };

  const openEditModal = (cat: AdminCategory) => {
    setEditingCategory(cat);
    setFormKey(cat.key);
    setFormLabel(cat.label);
    setFormVisible(cat.is_visible);
    setFormSort(cat.sort_order);
    setFormMaxGuests(cat.max_guests != null ? String(cat.max_guests) : '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formKey.trim() || !formLabel.trim()) {
      setError('Заполните все поля');
      return;
    }

    setError('');
    try {
      const payload = {
        key: formKey.trim(),
        label: formLabel.trim(),
        is_visible: formVisible,
        sort_order: formSort,
        max_guests: formMaxGuests.trim() === '' ? null : Number(formMaxGuests),
      };

      if (editingCategory) {
        await api.put(`/api/admin/categories/${editingCategory.id}`, payload);
      } else {
        await api.post('/api/admin/categories', payload);
      }

      setShowModal(false);
      await refreshCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  const handleDelete = async (id: number, key: string) => {
    if (!confirm(`Удалить категорию "${key}"?`)) return;

    setError('');
    try {
      await api.delete(`/api/admin/categories/${id}`);
      await refreshCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const toggleVisibility = async (cat: AdminCategory) => {
    setError('');
    try {
      await api.put(`/api/admin/categories/${cat.id}`, {
        is_visible: !cat.is_visible,
      });
      await refreshCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить видимость');
    }
  };

  if (loading) return <div className="admin-loading">Загрузка...</div>;
  if (error) return <div className="admin-error">{error}</div>;

  return (
    <div className="admin-categories">
      <div className="admin-categories__header">
        <h1>Категории номеров</h1>
        <button className="admin-categories__add-btn" onClick={openCreateModal}>
          + Добавить категорию
        </button>
      </div>

      <div className="admin-categories__table-wrap">
        <table className="admin-categories__table">
          <thead>
            <tr>
              <th>Ключ</th>
              <th>Название</th>
              <th>Порядок</th>
              <th>Видимость</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td><code>{cat.key}</code></td>
                <td>{cat.label}</td>
                <td>{cat.sort_order}</td>
                <td>
                  <button
                    className={`admin-categories__toggle ${cat.is_visible ? 'admin-categories__toggle--visible' : 'admin-categories__toggle--hidden'}`}
                    onClick={() => toggleVisibility(cat)}
                  >
                    {cat.is_visible ? '👁️ Показана' : '🙈 Скрыта'}
                  </button>
                </td>
                <td>
                  <button className="admin-categories__edit" onClick={() => openEditModal(cat)}>
                    ✏️
                  </button>
                  <button className="admin-categories__delete" onClick={() => handleDelete(cat.id, cat.key)}>
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="admin-categories__modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-categories__modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingCategory ? 'Редактировать категорию' : 'Новая категория'}</h2>
            <div className="admin-categories__modal-fields">
              <label>
                Ключ (только латиница, цифры, _ и -)
                <input
                  type="text"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  disabled={!!editingCategory}
                  placeholder="standard"
                />
              </label>
              <label>
                Название
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="Стандарт"
                />
              </label>
              <label>
                Порядок сортировки
                <input
                  type="number"
                  value={formSort}
                  onChange={(e) => setFormSort(Number(e.target.value))}
                  min="0"
                />
              </label>
              <label>
                Лимит гостей в пикере (необязательно)
                <input
                  type="number"
                  value={formMaxGuests}
                  onChange={(e) => setFormMaxGuests(e.target.value)}
                  min="1"
                  placeholder="без своего лимита — общий сайтовый"
                />
              </label>
              <label className="admin-categories__modal-checkbox">
                <input
                  type="checkbox"
                  checked={formVisible}
                  onChange={(e) => setFormVisible(e.target.checked)}
                />
                Показана на сайте
              </label>
            </div>
            <div className="admin-categories__modal-actions">
              <button className="admin-categories__modal-cancel" onClick={() => setShowModal(false)}>
                Отмена
              </button>
              <button className="admin-categories__modal-save" onClick={handleSave}>
                {editingCategory ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}