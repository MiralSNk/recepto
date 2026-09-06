'use client';

import Link from 'next/link';
import Logo from '@/assets/icons/logo.svg';
import '@/styles/not-found/not-found.scss';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Страница 404 с анимацией.
 */
export default function NotFound() {
  const contentRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLHeadingElement>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo(
      logoRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.7 }
    )
      .fromTo(
        codeRef.current,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' },
        '-=0.3'
      )
      .fromTo(
        titleRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5 },
        '-=0.2'
      )
      .fromTo(
        textRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5 },
        '-=0.2'
      )
      .fromTo(
        actionsRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5 },
        '-=0.2'
      );
  }, []);

  return (
    <div className="not-found">
      <div className="not-found__decoration not-found__decoration--left" aria-hidden />
      <div className="not-found__decoration not-found__decoration--right" aria-hidden />

      <div className="not-found__content" ref={contentRef}>
        <div ref={logoRef} className="not-found__logo-wrapper">
          <Logo className="not-found__logo" />
        </div>

        <h1 ref={codeRef} className="not-found__code">404</h1>
        <p ref={titleRef} className="not-found__title">Страница не найдена</p>
        <p ref={textRef} className="not-found__text">
          Возможно, вы перешли по устаревшей ссылке или адрес введён с ошибкой.
        </p>

        <div ref={actionsRef} className="not-found__actions">
          <Link href="/" className="not-found__btn not-found__btn--primary">
            На главную
          </Link>
          <Link href="/contacts" className="not-found__btn not-found__btn--ghost">
            Об отеле
          </Link>
          <Link href="#contacts" className="not-found__btn not-found__btn--ghost">
            Контакты
          </Link>
        </div>
      </div>
    </div>
  );
}