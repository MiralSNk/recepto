'use client';

import './Header.scss';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import PhoneIcon from '@/assets/icons/phone.svg';
import BrandTitle from '@/assets/icons/brand-title.svg';
import BrandSubtitle from '@/assets/icons/brand-subtitle.svg';
import { phoneToTelHref } from '@/lib/utils/phone';
import InlineSvgIcon from '@/components/InlineSvgIcon/InlineSvgIcon';

type HeaderProps = {
  logoTitle?: string;
  logoSubtitle?: string;
  hotelPhone?: string;
  socialMax?: string;
};

const Header = ({ logoTitle = '', logoSubtitle = '', hotelPhone = '', socialMax = '' }: HeaderProps) => {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isPhoneOpen, setPhoneOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // «Номера» ведёт на главную и сразу к панели выбора дат/гостей: если мы
  // уже на главной — просто скроллим к ней, иначе переходим и скроллим
  // после навигации (тот же паттерн, что и у смены категории на главной).
  const handleRoomsClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    closeMenu();
    const scrollToPanel = () =>
      document.getElementById('booking-panel-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (pathname === '/') {
      e.preventDefault();
      scrollToPanel();
      return;
    }
    router.push('/');
    setTimeout(scrollToPanel, 300);
  };

  const phoneWrapperRef = useRef<HTMLDivElement>(null);
  const phoneButtonRef = useRef<HTMLButtonElement>(null);
  const burgerWrapperRef = useRef<HTMLButtonElement>(null);

  // Статические страницы, где шапка всегда с фоном
  const staticPages = ['/contacts', '/privacy'];

  const isTransparentPath = (path: string): boolean => {
    // Админка всегда с фоном
    if (path.startsWith('/admin')) return false;
    // Статические страницы с фоном
    if (staticPages.includes(path)) return false;
    // Главная — прозрачная
    if (path === '/') return true;
    // Категория (один сегмент, например /comfort) — прозрачная
    if (/^\/[a-z0-9_-]+$/.test(path)) return true;
    // Номер (два сегмента, последний число, например /comfort/12) — прозрачная
    if (/^\/[a-z0-9_-]+\/\d+$/.test(path)) return true;
    // Все остальные (404, несуществующие) — с фоном
    return false;
  };

  const transparent = isTransparentPath(pathname);

  const getScrollThreshold = () => {
    if (typeof window === 'undefined') return 50;
    if (window.innerWidth < 768) return 90;
    if (window.innerWidth < 1024) return 70;
    return 50;
  };

  useEffect(() => {
    if (!transparent) {
      setIsScrolled(true);
      return;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > getScrollThreshold());
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [pathname, transparent]);

  // Блокируем прокрутку при открытом мобильном меню
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // Закрытие меню при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      if (
        isPhoneOpen &&
        phoneWrapperRef.current &&
        !phoneWrapperRef.current.contains(target)
      ) {
        setPhoneOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isPhoneOpen]);

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
    if (isPhoneOpen) setPhoneOpen(false);
  };

  const togglePhone = () => {
    setPhoneOpen((prev) => {
      const next = !prev;
      if (!next && phoneButtonRef.current) {
        phoneButtonRef.current.blur();
      }
      return next;
    });
    if (isMenuOpen) setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);
  const closePhone = () => {
    setPhoneOpen(false);
    if (phoneButtonRef.current) phoneButtonRef.current.blur();
  };

  return (
    <>
      <header
        className={`header${isScrolled ? ' header--scrolled' : ''}${
          !transparent ? ' header--sticky' : ''
        }`}
      >
        <div className="header__container">
          {/* Телефонная кнопка */}
          <div className="header__phone-wrapper" ref={phoneWrapperRef}>
            <button
              ref={phoneButtonRef}
              className={`header__phone-btn${isPhoneOpen ? ' header__phone-btn--active' : ''}`}
              onClick={togglePhone}
              aria-label="Позвонить"
              aria-expanded={isPhoneOpen}
            >
              <PhoneIcon className="header__phone-icon" />
            </button>

            {isPhoneOpen && (hotelPhone || socialMax) && (
              <div className="header__phone-menu">
                <ul className="header__phone-list">
                  {hotelPhone && (
                    <li>
                      <a href={phoneToTelHref(hotelPhone)} onClick={closePhone}>
                        {hotelPhone}
                      </a>
                    </li>
                  )}
                  {socialMax && (
                    <li>
                      <a href={socialMax} onClick={closePhone}>
                        Позвонить в Макс
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Бренд */}
          <Link href="/" className="header__brand" onClick={closeMenu}>
            {logoTitle ? (
              <InlineSvgIcon src={logoTitle} alt="Название" className="header__brand-name" />
            ) : (
              <BrandTitle className="header__brand-name" />
            )}
            {logoSubtitle ? (
              <InlineSvgIcon src={logoSubtitle} alt="Подпись" className="header__brand-sub" />
            ) : (
              <BrandSubtitle className="header__brand-sub" />
            )}
          </Link>

          {/* Навигация */}
          <nav className="header__nav">
            <ul className="header__nav-list">
              <li className="header__nav-item">
                <Link href="/" onClick={handleRoomsClick}>Номера</Link>
              </li>
              <li className="header__nav-item">
                <Link href="/contacts" onClick={closeMenu}>Об отеле</Link>
              </li>
              <li className="header__nav-item">
                <Link href="#contacts" onClick={closeMenu}>Контакты</Link>
              </li>
            </ul>
          </nav>

          {/* Бургер */}
          <button
            ref={burgerWrapperRef}
            className={`header__burger${isMenuOpen ? ' header__burger--active' : ''}`}
            onClick={toggleMenu}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          >
            <span className="header__burger-line" />
            <span className="header__burger-line" />
            <span className="header__burger-line" />
          </button>
        </div>
      </header>

      {/* Мобильное меню */}
      <div
        className={`mobile-menu-overlay${isMenuOpen ? ' mobile-menu-overlay--open' : ''}`}
        onClick={closeMenu}
      >
        <div className="mobile-menu-overlay__content" onClick={(e) => e.stopPropagation()}>
          <nav className="mobile-menu-overlay__nav">
            <Link href="/" onClick={handleRoomsClick}>Номера</Link>
            <Link href="/contacts" onClick={closeMenu}>Об отеле</Link>
            <Link href="#contacts" onClick={closeMenu}>Контакты</Link>
          </nav>

          {hotelPhone && (
            <a href={phoneToTelHref(hotelPhone)} className="mobile-menu-overlay__phone" onClick={closeMenu}>
              {hotelPhone}
            </a>
          )}
        </div>
      </div>
    </>
  );
};

export default Header;