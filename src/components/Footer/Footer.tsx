'use client';

import { useState, useEffect } from 'react';
import './Footer.scss';
import Link from 'next/link';
import Logo from '@/assets/icons/logo.svg';
import Telega from '@/assets/icons/telegram.svg';
import VK from '@/assets/icons/vk.svg';
import VKMax from '@/assets/icons/max.svg';
import { phoneToTelHref } from '@/lib/utils/phone';

type FooterProps = {
  hotelName?: string;
  hotelAddress?: string;
  hotelPhone?: string;
  hotelEmail?: string;
  socialVk?: string;
  socialTelegram?: string;
  socialMax?: string;
  footerAbout?: string;
  footerDisclaimer?: string;
};

const DEFAULT_ABOUT =
  'Наш отель предлагает своим гостям высокий уровень сервиса и квалифицированное обслуживание. Мы создали для проживающих наилучшие условия, поэтому они могут чувствовать себя в нём, как дома.';
const DEFAULT_DISCLAIMER = 'НЕ ЯВЛЯЕТСЯ ОФИЦИАЛЬНЫМ САЙТОМ ОТЕЛЯ. НОСИТ РЕКЛАМНЫЙ ХАРАКТЕР.';

const Footer = ({
  hotelName = 'Название вашего отеля',
  hotelAddress = '',
  hotelPhone = '',
  hotelEmail = '',
  socialVk = '',
  socialTelegram = '',
  socialMax = '',
  footerAbout = '',
  footerDisclaimer = '',
}: FooterProps) => {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="footer" id="contacts">
      <div className="footer__container">
        <div className="footer__top">
          <div className="footer__brand">
            <Logo className="footer__logo" />
          </div>
          <div className="footer__socials">
            {socialVk && (
              <a href={socialVk} target="_blank" rel="noopener noreferrer" aria-label="ВКонтакте">
                <VK />
              </a>
            )}
            {socialTelegram && (
              <a href={socialTelegram} target="_blank" rel="noopener noreferrer" aria-label="Телеграмм">
                <Telega />
              </a>
            )}
            {socialMax && (
              <a href={socialMax} aria-label="Вк Макс">
                <VKMax />
              </a>
            )}
          </div>
        </div>

        <div className="footer__grid">
          <div className="footer__column footer__column--about">
            <h3 className="footer__heading">О гостинице</h3>
            <p className="footer__text">{footerAbout || DEFAULT_ABOUT}</p>
          </div>

          <div className="footer__column footer__column--contacts">
            <h3 className="footer__heading">Контакты</h3>
            <ul className="footer__contacts-list">
              {hotelAddress && <li><span>{hotelAddress}</span></li>}
              {hotelPhone && <li><a href={phoneToTelHref(hotelPhone)}>{hotelPhone}</a></li>}
              {hotelEmail && <li><a href={`mailto:${hotelEmail}`}>{hotelEmail}</a></li>}
            </ul>
          </div>

          <div className="footer__column footer__column--info">
            <h3 className="footer__heading">Информация</h3>
            <ul className="footer__info-list">
              <li><Link href="/contacts">О нас</Link></li>
              <li><Link href="/">Номера</Link></li>
              <li><Link href="/privacy">Политика конфиденциальности</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p className="footer__disclaimer">{footerDisclaimer || DEFAULT_DISCLAIMER}</p>
          <p className="footer__copy">
            &copy; {currentYear ?? '2026'} {hotelName}. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;