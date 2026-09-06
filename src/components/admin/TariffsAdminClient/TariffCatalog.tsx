'use client';

import { useEffect, useState } from 'react';
import { Tariff } from '@/types';
import { api } from '@/lib/utils/api';
import './TariffCatalog.scss';

export default function TariffCatalog() {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingBuiltinId, setSavingBuiltinId] = useState<number | null>(null);
  const [builtinDrafts, setBuiltinDrafts] = useState<Record<number, { label: string; price: string }>>({});

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Tariff | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formPrice, setFormPrice] = useState('0');
  const [formInCalculator, setFormInCalculator] = useState(false);
  const [formSort, setFormSort] = useState(0);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setError('');
    try {
      const data = await api.get<Tariff[]>('/api/admin/tariffs');
      setTariffs(data);
      setBuiltinDrafts(
        Object.fromEntries(
          data.filter((t) => t.is_builtin).map((t) => [t.id, { label: t.label, price: String(t.price) }])
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить тарифы');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const builtinTariffs = tariffs.filter((t) => t.is_builtin);
  const additionalTariffs = tariffs.filter((t) => !t.is_builtin);

  const saveBuiltin = async (tariff: Tariff) => {
    const draft = builtinDrafts[tariff.id];
    if (!draft) return;
    const price = Number(draft.price);
    if (!draft.label.trim() || !Number.isFinite(price) || price < 0) {
      setError('Проверьте название и цену тарифа');
      return;
    }
    setSavingBuiltinId(tariff.id);
    setError('');
    try {
      await api.put(`/api/admin/tariffs/${tariff.id}`, { label: draft.label.trim(), price });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingBuiltinId(null);
    }
  };

  const openCreateModal = () => {
    setEditing(null);
    setFormKey('');
    setFormLabel('');
    setFormPrice('0');
    setFormInCalculator(false);
    setFormSort(0);
    setShowModal(true);
  };

  const openEditModal = (t: Tariff) => {
    setEditing(t);
    setFormKey(t.tariff_key);
    setFormLabel(t.label);
    setFormPrice(String(t.price));
    setFormInCalculator(t.in_calculator);
    setFormSort(t.sort_order);
    setShowModal(true);
  };

  const handleSave = async () => {
    const price = Number(formPrice);
    if (!formLabel.trim() || !Number.isFinite(price) || price < 0) {
      setError('Заполните название и корректную цену');
      return;
    }
    if (!editing && !formKey.trim()) {
      setError('Заполните ключ тарифа');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.put(`/api/admin/tariffs/${editing.id}`, {
          label: formLabel.trim(),
          price,
          in_calculator: formInCalculator,
          sort_order: formSort,
        });
      } else {
        await api.post('/api/admin/tariffs', {
          tariff_key: formKey.trim(),
          label: formLabel.trim(),
          price,
          in_calculator: formInCalculator,
          sort_order: formSort,
        });
      }
      setShowModal(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: Tariff) => {
    if (!confirm(`Удалить тариф "${t.label}"?`)) return;
    setError('');
    try {
      await api.delete(`/api/admin/tariffs/${t.id}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const toggleInCalculator = async (t: Tariff) => {
    setError('');
    try {
      await api.put(`/api/admin/tariffs/${t.id}`, { in_calculator: !t.in_calculator });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  if (loading) return <div className="admin-tariffs__loading">Загрузка тарифов...</div>;

  return (
    <div className="admin-tariffs">
      <h2 className="admin-tariffs__title">Тарифы</h2>
      {error && <p className="admin-error">{error}</p>}

      <section className="admin-tariffs__section">
        <h3>Основные тарифы</h3>
        <p className="admin-tariffs__hint">
          Доплаты за 2-го и 3-го+ гостя — единственный источник этих цифр для калькулятора,
          формы бронирования и ИИ-помощника. Ключ и участие в формуле у них фиксированы.
        </p>
        <div className="admin-tariffs__builtin-list">
          {builtinTariffs.map((t) => {
            const draft = builtinDrafts[t.id] || { label: t.label, price: String(t.price) };
            return (
              <div key={t.id} className="admin-tariffs__builtin-row">
                <input
                  type="text"
                  value={draft.label}
                  onChange={(e) =>
                    setBuiltinDrafts((prev) => ({ ...prev, [t.id]: { ...draft, label: e.target.value } }))
                  }
                />
                <input
                  type="number"
                  min={0}
                  value={draft.price}
                  onChange={(e) =>
                    setBuiltinDrafts((prev) => ({ ...prev, [t.id]: { ...draft, price: e.target.value } }))
                  }
                />
                <span className="admin-tariffs__unit">₽/ночь</span>
                <button
                  type="button"
                  className="admin-tariffs__save-row-btn"
                  onClick={() => saveBuiltin(t)}
                  disabled={savingBuiltinId === t.id}
                >
                  {savingBuiltinId === t.id ? 'Сохранение…' : 'Сохранить'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="admin-tariffs__section">
        <div className="admin-tariffs__section-header">
          <h3>Дополнительные тарифы</h3>
          <button className="admin-tariffs__add-btn" onClick={openCreateModal}>
            + Добавить тариф
          </button>
        </div>
        <p className="admin-tariffs__hint">
          Переиспользуемый каталог (как «Удобства») — привязывается к номерам в разделе «Номера»
          → «Доп. услуги с фиксированной ценой». Отметьте «участвует в калькуляторе», чтобы тариф
          был доступен как карточка в конструкторе формулы ниже.
        </p>

        <div className="admin-tariffs__table-wrap">
          <table className="admin-tariffs__table">
            <thead>
              <tr>
                <th>Ключ</th>
                <th>Название</th>
                <th>Цена</th>
                <th>В калькуляторе</th>
                <th>Порядок</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {additionalTariffs.map((t) => (
                <tr key={t.id}>
                  <td><code>{t.tariff_key}</code></td>
                  <td>{t.label}</td>
                  <td>{t.price.toLocaleString('ru-RU')} ₽</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={t.in_calculator}
                      onChange={() => toggleInCalculator(t)}
                    />
                  </td>
                  <td>{t.sort_order}</td>
                  <td>
                    <button className="admin-tariffs__edit" onClick={() => openEditModal(t)}>
                      ✏️
                    </button>
                    <button className="admin-tariffs__delete" onClick={() => handleDelete(t)}>
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {additionalTariffs.length === 0 && (
                <tr>
                  <td colSpan={6} className="admin-tariffs__empty">
                    Пока нет дополнительных тарифов
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className="admin-tariffs__modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-tariffs__modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Редактировать тариф' : 'Новый тариф'}</h2>
            <div className="admin-tariffs__modal-fields">
              <label>
                Ключ (латиница со строчной буквы, цифры, _, без дефиса)
                <input
                  type="text"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  disabled={!!editing}
                  placeholder="pet_deposit"
                />
              </label>
              <label>
                Название (видно администратору и в конструкторе)
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="Депозит за животных"
                />
              </label>
              <label>
                Цена, ₽
                <input
                  type="number"
                  min={0}
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                />
              </label>
              <label className="admin-tariffs__checkbox-field">
                <input
                  type="checkbox"
                  checked={formInCalculator}
                  onChange={(e) => setFormInCalculator(e.target.checked)}
                />
                <span>Участвует в калькуляторе (доступен как карточка в конструкторе формулы)</span>
              </label>
              <label>
                Порядок сортировки
                <input
                  type="number"
                  min={0}
                  value={formSort}
                  onChange={(e) => setFormSort(Number(e.target.value) || 0)}
                />
              </label>
            </div>
            <div className="admin-tariffs__modal-actions">
              <button className="admin-tariffs__modal-cancel" onClick={() => setShowModal(false)}>
                Отмена
              </button>
              <button className="admin-tariffs__modal-save" onClick={handleSave} disabled={saving}>
                {editing ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
