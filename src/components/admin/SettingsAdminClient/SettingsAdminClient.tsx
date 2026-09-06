'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/utils/api';
import './SettingsAdminClient.scss';

interface SettingItem {
  key: string;
  value: string;
  editable: boolean;
  secret: boolean;
  description: string;
}

export default function SettingsAdminClient() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingSecretKey, setEditingSecretKey] = useState<string | null>(null);
  const [secretInput, setSecretInput] = useState('');

  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState('');

  const [swCurrentPassword, setSwCurrentPassword] = useState('');
  const [swSecretWord, setSwSecretWord] = useState('');
  const [swConfirm, setSwConfirm] = useState('');
  const [swSaving, setSwSaving] = useState(false);
  const [swMessage, setSwMessage] = useState('');

  useEffect(() => {
    api
      .get<Record<string, { value: string; editable: boolean; secret: boolean; description: string }>>('/api/admin/settings')
      .then((data) => {
        const arr = Object.entries(data).map(([key, val]) => ({
          key,
          value: val.value,
          editable: val.editable,
          secret: val.secret,
          description: val.description,
        }));
        setSettings(arr);
      })
      .catch((err) => setMessage(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) =>
      prev.map((item) => (item.key === key ? { ...item, value } : item))
    );
  };

  const handleSave = async () => {
    const changingSecret = Boolean(editingSecretKey && secretInput.trim());
    let currentPassword = '';
    if (changingSecret) {
      currentPassword = window.prompt('Изменение секретного значения — введите текущий пароль администратора:') || '';
      if (!currentPassword) return;
    }

    setSaving(true);
    setMessage('');
    try {
      const payload: Record<string, string> = {};

      settings.forEach((item) => {
        if (item.editable) {
          payload[item.key] = item.value;
        }
      });

      if (editingSecretKey && secretInput.trim()) {
        payload[editingSecretKey] = secretInput.trim();
      }
      if (changingSecret) {
        payload.currentPassword = currentPassword;
      }

      const data = await api.put<{ message?: string }>('/api/admin/settings', payload);
      setMessage(data.message || 'Настройки сохранены');
      setEditingSecretKey(null);
      setSecretInput('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwMessage('');
    if (pwNew.length < 8) {
      setPwMessage('Новый пароль должен быть не короче 8 символов');
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwMessage('Пароли не совпадают');
      return;
    }
    setPwSaving(true);
    try {
      await api.put('/api/admin/change-password', {
        currentPassword: pwCurrent,
        newPassword: pwNew,
      });
      setPwMessage('Пароль изменён');
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
    } catch (err) {
      setPwMessage(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setPwSaving(false);
    }
  };

  const handleSetSecretWord = async () => {
    setSwMessage('');
    if (swSecretWord.length < 4) {
      setSwMessage('Секретное слово должно быть не короче 4 символов');
      return;
    }
    if (swSecretWord !== swConfirm) {
      setSwMessage('Слова не совпадают');
      return;
    }
    setSwSaving(true);
    try {
      await api.put('/api/admin/secret-word', {
        currentPassword: swCurrentPassword,
        secretWord: swSecretWord,
      });
      setSwMessage('Секретное слово сохранено');
      setSwCurrentPassword('');
      setSwSecretWord('');
      setSwConfirm('');
    } catch (err) {
      setSwMessage(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSwSaving(false);
    }
  };

  return (
    <div className="settings-admin">
      <h1 className="settings-admin__title">Настройки</h1>

      <section className="settings-admin__password">
        <h2 className="settings-admin__subtitle">Смена пароля</h2>
        <div className="settings-admin__password-fields">
          <input
            type="password"
            placeholder="Текущий пароль"
            value={pwCurrent}
            onChange={(e) => setPwCurrent(e.target.value)}
          />
          <input
            type="password"
            placeholder="Новый пароль"
            value={pwNew}
            onChange={(e) => setPwNew(e.target.value)}
          />
          <input
            type="password"
            placeholder="Повторите новый пароль"
            value={pwConfirm}
            onChange={(e) => setPwConfirm(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="settings-admin__save-btn"
          onClick={handleChangePassword}
          disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}
        >
          {pwSaving ? 'Сохранение...' : 'Сменить пароль'}
        </button>
        {pwMessage && <p className="settings-admin__message">{pwMessage}</p>}
      </section>

      <section className="settings-admin__password">
        <h2 className="settings-admin__subtitle">Секретное слово для восстановления пароля</h2>
        <p className="settings-admin__hint">
          Если забудете пароль от админки — на странице входа можно будет восстановить его по
          этому слову (email для сброса пароля в системе не настроен). Задайте слово, которое
          легко запомнить, но сложно угадать постороннему.
        </p>
        <div className="settings-admin__password-fields">
          <input
            type="password"
            placeholder="Текущий пароль"
            value={swCurrentPassword}
            onChange={(e) => setSwCurrentPassword(e.target.value)}
          />
          <input
            type="text"
            placeholder="Секретное слово"
            value={swSecretWord}
            onChange={(e) => setSwSecretWord(e.target.value)}
          />
          <input
            type="text"
            placeholder="Повторите секретное слово"
            value={swConfirm}
            onChange={(e) => setSwConfirm(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="settings-admin__save-btn"
          onClick={handleSetSecretWord}
          disabled={swSaving || !swCurrentPassword || !swSecretWord || !swConfirm}
        >
          {swSaving ? 'Сохранение...' : 'Сохранить секретное слово'}
        </button>
        {swMessage && <p className="settings-admin__message">{swMessage}</p>}
      </section>

      <p className="settings-admin__hint">
        Ниже перечислены переменные окружения. Редактируемые поля можно менять. Секретные поля скрыты, для изменения нажмите «Изменить». После сохранения перезапустите приложение: <code>pm2 restart recepto</code>.
      </p>

      <div className="settings-admin__list">
        {settings.map((item) => (
          <div key={item.key} className="settings-admin__row">
            <div className="settings-admin__info">
              <strong>{item.key}</strong>
              <span>{item.description}</span>
            </div>
            <div className="settings-admin__control">
              {item.secret ? (
                <div className="settings-admin__secret-row">
                  {editingSecretKey === item.key ? (
                    <>
                      <input
                        type="password"
                        value={secretInput}
                        onChange={(e) => setSecretInput(e.target.value)}
                        placeholder="Введите новый секрет"
                        autoFocus
                      />
                      <button
                        type="button"
                        className="settings-admin__secret-cancel"
                        onClick={() => {
                          setEditingSecretKey(null);
                          setSecretInput('');
                        }}
                      >
                        Отмена
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="settings-admin__secret-value">••••••••</span>
                      <button
                        type="button"
                        className="settings-admin__secret-edit"
                        onClick={() => {
                          setEditingSecretKey(item.key);
                          setSecretInput('');
                        }}
                      >
                        Изменить
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => handleChange(item.key, e.target.value)}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        className="settings-admin__save-btn"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Сохранение...' : 'Сохранить изменения'}
      </button>

      {message && <p className="settings-admin__message">{message}</p>}
    </div>
  );
}