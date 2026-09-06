'use client';

import { useState, useEffect, useRef } from 'react';
import './BookingPanel.scss';
import DateRangePicker from '@/components/DateRangePicker/DateRangePicker';
import GuestSelector from '@/components/GuestSelector/GuestSelector';
import CategoryChips from './CategoryChips';
import { Guests } from '@/types';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Регистрируем плагин ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

export type CategoryChip = { key: string; label: string };

interface BookingPanelProps {
  checkIn: Date | null;
  checkOut: Date | null;
  onDateChange: (dates: { checkIn: Date; checkOut: Date }) => void;
  guests: Guests;
  onGuestsChange: (guests: Guests) => void;
  childAges: number[];
  onChildAgesChange: (ages: number[]) => void;
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  isPending: boolean;
  categories: CategoryChip[];
  maxGuests?: number;
}

/**
 * Панель бронирования: выбор дат, гостей и категории.
 * Состоит из "карточки" (даты + гости) и липкой панели категорий.
 */
export default function BookingPanel({
  checkIn,
  checkOut,
  onDateChange,
  guests,
  onGuestsChange,
  childAges,
  onChildAgesChange,
  activeCategory,
  onCategoryChange,
  isPending,
  categories,
  maxGuests = 10,
}: BookingPanelProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Отслеживаем прокрутку для изменения фона карточки
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Анимация появления карточки при скролле
  useEffect(() => {
    if (!cardRef.current) return;

    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: cardRef.current,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      }
    );
  }, []);

  return (
    <>
      {/* Карточка с датами и гостями */}
      <div
        className={`booking-panel ${
          isScrolled ? 'booking-panel--scrolled' : ''
        } ${isPending ? 'booking-panel--pending' : ''}`}
      >
        <div
          className="booking-panel__card"
          ref={cardRef}
          id="booking-panel-card"
        >
          <div className="booking-panel__container">
            <DateRangePicker
              checkIn={checkIn}
              checkOut={checkOut}
              onDateChange={onDateChange}
            />
            <GuestSelector
              guests={guests}
              onChange={onGuestsChange}
              childAges={childAges}
              onChildAgesChange={onChildAgesChange}
              maxTotal={maxGuests}
            />
          </div>
        </div>
      </div>

      {/* Категории */}
      <CategoryChips
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={onCategoryChange}
      />
    </>
  );
}