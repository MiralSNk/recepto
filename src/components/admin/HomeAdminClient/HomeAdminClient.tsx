'use client';

import { useEffect, useState } from 'react';
import './HomeAdminClient.scss';
import { useFileUpload } from '@/hooks';
import { api } from '@/lib/utils/api';

export default function HomeAdminClient() {
  const [heroBg, setHeroBg] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [logoFull, setLogoFull] = useState('');
  const [logoTitle, setLogoTitle] = useState('');
  const [logoSubtitle, setLogoSubtitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [fixSvgHeroBg, setFixSvgHeroBg] = useState(false);
  const [fixSvgLogoFull, setFixSvgLogoFull] = useState(false);
  const [fixSvgLogoTitle, setFixSvgLogoTitle] = useState(false);
  const [fixSvgLogoSubtitle, setFixSvgLogoSubtitle] = useState(false);

  const { upload, uploading } = useFileUpload({
    onError: (err) => setMessage(err.message),
  });

  useEffect(() => {
    api
      .get('/api/admin/home')
      .then((data: any) => {
        setHeroBg(data.hero_bg || '');
        setHeroTitle(data.hero_title || '');
        setHeroSubtitle(data.hero_subtitle || '');
        setLogoFull(data.logo_full || '');
        setLogoTitle(data.logo_title || '');
        setLogoSubtitle(data.logo_subtitle || '');
      })
      .catch((err) => setMessage(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void,
    fixSvgColor: boolean
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file, { fixSvgColor: file.type === 'image/svg+xml' && fixSvgColor });
    if (url) setter(url);
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.put('/api/admin/home', {
        hero_bg: heroBg,
        hero_title: heroTitle,
        hero_subtitle: heroSubtitle,
        logo_full: logoFull,
        logo_title: logoTitle,
        logo_subtitle: logoSubtitle,
      });
      setMessage('Настройки сохранены');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="home-admin__loading">Загрузка...</div>;

  return (
    <div className="home-admin">
      <h1 className="home-admin__title">Главная страница</h1>

      {/* Hero */}
      <section className="home-admin__section">
        <h2>Hero</h2>

        <label>
          Фоновое изображение
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={(e) => handleFileChange(e, setHeroBg, fixSvgHeroBg)}
          />
        </label>
        <label className="home-admin__checkbox-field">
          <input
            type="checkbox"
            checked={fixSvgHeroBg}
            onChange={(e) => setFixSvgHeroBg(e.target.checked)}
          />
          <span>Если SVG — попробовать исправить fill на currentColor автоматически</span>
        </label>

        {heroBg ? (
          <div className="home-admin__preview-wrap">
            <img src={heroBg} alt="Hero background" className="home-admin__preview" />
            <button
              type="button"
              className="home-admin__remove-btn"
              onClick={() => setHeroBg('')}
            >
              Удалить
            </button>
          </div>
        ) : (
          <p className="home-admin__empty">Фон не задан (используется /hero-bg.png)</p>
        )}

        <label>
          Заголовок
          <input
            type="text"
            value={heroTitle}
            onChange={(e) => setHeroTitle(e.target.value)}
            placeholder="Комфортные номера, внимательный сервис и всё для удобного проживания"
          />
        </label>

        <label>
          Подзаголовок
          <textarea
            value={heroSubtitle}
            onChange={(e) => setHeroSubtitle(e.target.value)}
            rows={3}
            placeholder="Комфортные номера, внимательный сервис..."
          />
        </label>
      </section>

      {/* Логотипы */}
      <section className="home-admin__section">
        <h2>Логотипы</h2>
        <p className="home-admin__hint">
          Рекомендуется использовать SVG с атрибутом <code>fill="currentColor"</code> для динамической смены цвета.
        </p>

        {/* Полный логотип */}
        <div className="home-admin__logo-row">
          <label>
            Полный логотип (favicon)
            <input
              type="file"
              accept="image/svg+xml,image/png,image/jpeg"
              onChange={(e) => handleFileChange(e, setLogoFull, fixSvgLogoFull)}
            />
          </label>
          <label className="home-admin__checkbox-field">
            <input
              type="checkbox"
              checked={fixSvgLogoFull}
              onChange={(e) => setFixSvgLogoFull(e.target.checked)}
            />
            <span>Если SVG — попробовать исправить fill на currentColor автоматически</span>
          </label>
          {logoFull ? (
            <div className="home-admin__logo-preview-wrap">
              <img src={logoFull} alt="Full logo" className="home-admin__logo-preview" />
              <button
                type="button"
                className="home-admin__remove-btn"
                onClick={() => setLogoFull('')}
              >
                Удалить
              </button>
            </div>
          ) : (
            <p className="home-admin__empty">Полный логотип не задан (используется icon.svg)</p>
          )}
        </div>

        {/* Название */}
        <div className="home-admin__logo-row">
          <label>
            Название (для шапки)
            <input
              type="file"
              accept="image/svg+xml,image/png,image/jpeg"
              onChange={(e) => handleFileChange(e, setLogoTitle, fixSvgLogoTitle)}
            />
          </label>
          <label className="home-admin__checkbox-field">
            <input
              type="checkbox"
              checked={fixSvgLogoTitle}
              onChange={(e) => setFixSvgLogoTitle(e.target.checked)}
            />
            <span>Если SVG — попробовать исправить fill на currentColor автоматически</span>
          </label>
          {logoTitle ? (
            <div className="home-admin__logo-preview-wrap">
              <img src={logoTitle} alt="Title logo" className="home-admin__logo-preview" />
              <button
                type="button"
                className="home-admin__remove-btn"
                onClick={() => setLogoTitle('')}
              >
                Удалить
              </button>
            </div>
          ) : (
            <p className="home-admin__empty">Название не задано (используется brand-title.svg)</p>
          )}
        </div>

        {/* Подпись */}
        <div className="home-admin__logo-row">
          <label>
            Подпись (для шапки)
            <input
              type="file"
              accept="image/svg+xml,image/png,image/jpeg"
              onChange={(e) => handleFileChange(e, setLogoSubtitle, fixSvgLogoSubtitle)}
            />
          </label>
          <label className="home-admin__checkbox-field">
            <input
              type="checkbox"
              checked={fixSvgLogoSubtitle}
              onChange={(e) => setFixSvgLogoSubtitle(e.target.checked)}
            />
            <span>Если SVG — попробовать исправить fill на currentColor автоматически</span>
          </label>
          {logoSubtitle ? (
            <div className="home-admin__logo-preview-wrap">
              <img src={logoSubtitle} alt="Subtitle logo" className="home-admin__logo-preview" />
              <button
                type="button"
                className="home-admin__remove-btn"
                onClick={() => setLogoSubtitle('')}
              >
                Удалить
              </button>
            </div>
          ) : (
            <p className="home-admin__empty">Подпись не задана (используется brand-subtitle.svg)</p>
          )}
        </div>
      </section>

      <button className="home-admin__save-btn" onClick={handleSave} disabled={saving}>
        {saving ? 'Сохранение...' : 'Сохранить'}
      </button>

      {message && <p className="home-admin__message">{message}</p>}
    </div>
  );
}