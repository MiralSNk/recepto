'use client';

import { useState } from 'react';
import YandexCaptcha from '@/components/YandexCaptcha/YandexCaptchaLazy';
import './ContactsPage.scss';
import Link from 'next/link';

const DEFAULT_ABOUT = [
  'Наш отель предлагает удобные номера различного класса — люкс, стандарт. Каждый номер оснащён всем необходимым для комфортного проживания: телевизором, кондиционером, холодильником и удобной мебелью.',
  'На сайте отеля доступно онлайн-бронирование номеров. Заявка на бронирование рассматривается в течение суток.',
].join('\n');
const DEFAULT_HOTEL_NAME = 'Название вашего отеля';

type ContactsPageProps = {
  aboutContent?: string;
  hotelName?: string;
};

const ContactsPage = ({ aboutContent = '', hotelName = '' }: ContactsPageProps) => {
  const paragraphs = (aboutContent || DEFAULT_ABOUT).split('\n').filter((p) => p.trim());
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [agreed, setAgreed] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreed) {
      setServerError('Нужно согласие на обработку персональных данных');
      setStatus('error');
      return;
    }

    if (!captchaToken) {
      setCaptchaError(true);
      return;
    }

    setStatus('loading');
    setServerError('');

    try {
      const res = await fetch('/api/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'contact',
          name: formData.name,
          email: formData.email,
          message: formData.message,
          captchaToken,
          agreed,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ошибка отправки');

      setStatus('success');
      setFormData({ name: '', email: '', message: '' });
      setCaptchaToken(null);
      setCaptchaKey((k) => k + 1); // пересоздать виджет
      setAgreed(false);
    } catch (err) {
      setStatus('error');
      setServerError(
        err instanceof Error ? err.message : 'Не удалось отправить'
      );
    }
  };

  return (
    <div className="contacts-page">
      <h1 className="contacts-page__title">Об отеле</h1>

      <div className="contacts-page__description">
        <h2>{hotelName || DEFAULT_HOTEL_NAME}</h2>
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="contacts-page__form-section">
        <h2>Напишите нам</h2>

        <form className="contacts-page__form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Ваше имя"
            value={formData.name}
            onChange={handleChange}
            autoComplete="name"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Электронная почта"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
          <textarea
            name="message"
            placeholder="Сообщение"
            rows={4}
            value={formData.message}
            onChange={handleChange}
            required
          />

          <label className="contacts-page__agree">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              Я согласен с{' '}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                политикой конфиденциальности
              </Link>{' '}
              и обработкой персональных данных
            </span>
          </label>

          <div className="contacts-page__captcha">
            <YandexCaptcha
              resetKey={captchaKey}
              onSuccess={(token) => {
                setCaptchaToken(token);
                setCaptchaError(false);
              }}
            />
            {captchaError && (
              <span className="contacts-page__captcha-error">
                Подтвердите, что вы не робот
              </span>
            )}
          </div>

          <button
            type="submit"
            className="contacts-page__submit-btn"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Отправка…' : 'Отправить'}
          </button>

          {status === 'success' && (
            <p className="contacts-page__success">
              Спасибо! Сообщение отправлено. Мы ответим в ближайшее время.
            </p>
          )}

          {status === 'error' && (
            <p className="contacts-page__error">{serverError}</p>
          )}
        </form>
      </div>
    </div>
  );
};

export default ContactsPage;