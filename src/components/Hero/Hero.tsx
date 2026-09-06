'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './Hero.scss';

gsap.registerPlugin(ScrollTrigger);

type HeroProps = {
  heroBg?: string;
  heroTitle?: string;
  heroSubtitle?: string;
};

const DEFAULT_TITLE = 'Уютный отель\nдля вашего отдыха';
const DEFAULT_SUBTITLE =
  'Комфортные номера, внимательный сервис и всё для удобного проживания';

export default function Hero({
  heroBg = '/hero-bg.png',
  heroTitle = DEFAULT_TITLE,
  heroSubtitle = DEFAULT_SUBTITLE,
}: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Определяем тип устройства для адаптации скорости фейда
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const isTablet = window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches;

    let fadeEnd = '80% top'; // десктоп (по умолчанию)
    if (isMobile) fadeEnd = '150% top';
    else if (isTablet) fadeEnd = '120% top';

    const ctx = gsap.context(() => {
      // Параллакс фона
      gsap.to(bgRef.current, {
        yPercent: 20,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      // Фейд контента при прокрутке вверх (с адаптивным end)
      gsap.to(contentRef.current, {
        opacity: 0,
        y: -40,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: fadeEnd,
          scrub: true,
        },
      });

      // Появление заголовка и подзаголовка при загрузке
      const tl = gsap.timeline({ delay: 0.3 });
      tl.fromTo(
        '.hero__title',
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' }
      ).fromTo(
        '.hero__subtitle',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out' },
        '-=0.6'
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Разбиваем текст заголовка на строки (если в БД используется \n)
  const renderTitle = () => {
    if (heroTitle.includes('\n')) {
      return heroTitle.split('\n').map((line, index) => (
        <span key={index}>
          {line}
          {index < heroTitle.split('\n').length - 1 && <br />}
        </span>
      ));
    }
    return heroTitle;
  };

  return (
    <section className="hero" ref={sectionRef}>
      <div
        className="hero__bg"
        ref={bgRef}
        style={{ backgroundImage: `url('${heroBg}')` }}
      />
      <div className="hero__overlay" />

      <div className="hero__content" ref={contentRef}>
        <h1 className="hero__title">{renderTitle()}</h1>
        <p className="hero__subtitle">{heroSubtitle}</p>
      </div>
    </section>
  );
}