'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { api } from '@/lib/utils/api';
import '@/components/admin/Login/Login.scss';

type Mode = 'login' | 'recover-verify' | 'recover-reset';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [mode, setMode] = useState<Mode>('login');
  const [secretWord, setSecretWord] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [recoverError, setRecoverError] = useState('');
  const [recoverMessage, setRecoverMessage] = useState('');
  const [recoverLoading, setRecoverLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Неверный email или пароль');
    } else {
      window.location.href = '/admin';
    }
  };

  const openRecovery = () => {
    setMode('recover-verify');
    setError('');
    setRecoverError('');
    setRecoverMessage('');
    setSecretWord('');
    setNewPassword('');
    setNewPasswordConfirm('');
  };

  const backToLogin = () => {
    setMode('login');
    setRecoverError('');
    setSecretWord('');
    setNewPassword('');
    setNewPasswordConfirm('');
  };

  const handleVerifySecretWord = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError('');
    setRecoverLoading(true);
    try {
      await api.post('/api/admin-recovery/verify', { secretWord });
      // Слово держим в стейте (не просим ввести повторно) — сам /reset всё
      // равно перепроверяет его на сервере перед сменой пароля.
      setMode('recover-reset');
    } catch (err) {
      setRecoverError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setRecoverLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError('');
    if (newPassword.length < 8) {
      setRecoverError('Новый пароль должен быть не короче 8 символов');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setRecoverError('Пароли не совпадают');
      return;
    }
    setRecoverLoading(true);
    try {
      await api.post('/api/admin-recovery/reset', { secretWord, newPassword });
      setRecoverMessage('Пароль изменён — войдите с новым паролем.');
      setMode('login');
      setPassword('');
    } catch (err) {
      setRecoverError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setRecoverLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__card">
        {mode === 'login' && (
          <>
            <h1>Вход в админку</h1>
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && <p className="login-page__error">{error}</p>}
              <button type="submit">Войти</button>
            </form>
            {recoverMessage && <p className="login-page__success">{recoverMessage}</p>}
            <button type="button" className="login-page__link" onClick={openRecovery}>
              Забыли пароль?
            </button>
          </>
        )}

        {mode === 'recover-verify' && (
          <>
            <h1>Восстановление пароля</h1>
            <form onSubmit={handleVerifySecretWord}>
              <input
                type="text"
                placeholder="Секретное слово"
                value={secretWord}
                onChange={(e) => setSecretWord(e.target.value)}
                autoFocus
                required
              />
              {recoverError && <p className="login-page__error">{recoverError}</p>}
              <button type="submit" disabled={recoverLoading}>
                {recoverLoading ? 'Проверка...' : 'Продолжить'}
              </button>
            </form>
            <button type="button" className="login-page__link" onClick={backToLogin}>
              Назад ко входу
            </button>
          </>
        )}

        {mode === 'recover-reset' && (
          <>
            <h1>Новый пароль</h1>
            <form onSubmit={handleReset}>
              <input
                type="password"
                placeholder="Новый пароль"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
                required
              />
              <input
                type="password"
                placeholder="Повторите новый пароль"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                required
              />
              {recoverError && <p className="login-page__error">{recoverError}</p>}
              <button type="submit" disabled={recoverLoading}>
                {recoverLoading ? 'Сохранение...' : 'Сохранить пароль'}
              </button>
            </form>
            <button type="button" className="login-page__link" onClick={backToLogin}>
              Назад ко входу
            </button>
          </>
        )}
      </div>
    </div>
  );
}
