'use client';

/**
 * Модальный просмотр номера (parallel route / overlay).
 * Вход/выход — GSAP timeline; Escape и клик по оверлею закрывают.
 */

import gsap from 'gsap';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import RoomDetailContent from './RoomDetailContent';
import type { Amenity, Room } from '@/types';

export interface RoomDetailModalProps {
  room: Room;
  checkIn?: string;
  checkOut?: string;
  adults?: string;
  children?: string;
  childAges?: number[];
  amenityCatalog?: Amenity[];
  capacityHeading?: string;
  priceNote?: string;
  hotelName?: string;
}

export default function RoomDetailModal({
  room,
  checkIn,
  checkOut,
  adults,
  children,
  childAges,
  amenityCatalog,
  capacityHeading,
  priceNote,
  hotelName = 'Название вашего отеля',
}: RoomDetailModalProps) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const prevTitle = document.title;
    document.title = `${room.name} | ${hotelName}`;
    return () => {
      document.body.style.overflow = '';
      document.title = prevTitle;
    };
  }, [room.name, hotelName]);

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 }).fromTo(
      containerRef.current,
      { yPercent: -100 },
      { yPercent: 0, duration: 0.5, ease: 'power3.out' },
      '-=0.25'
    );
  }, []);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);

    const fallback = () => {
      router.replace(`/${room.category || ''}`);
    };

    const tl = gsap.timeline({
      onComplete: () => {
        try {
          if (window.history.length > 1) router.back();
          else fallback();
        } catch {
          fallback();
        } finally {
          setIsClosing(false);
        }
      },
    });

    tl.to(containerRef.current, {
      yPercent: -100,
      duration: 0.4,
      ease: 'power3.in',
    }).to(overlayRef.current, { opacity: 0, duration: 0.25 }, '-=0.25');
  }, [isClosing, router, room.category]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  return (
    <div className="room-detail" ref={overlayRef} onClick={handleClose}>
      <div
        className="room-detail__container"
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="room-detail__back-wrapper">
          <button
            type="button"
            className="room-detail__back"
            onClick={handleClose}
            aria-label="Назад"
          />
        </div>
        <RoomDetailContent
          room={room}
          checkIn={checkIn}
          checkOut={checkOut}
          adults={adults}
          children={children}
          childAges={childAges}
          amenityCatalog={amenityCatalog}
          capacityHeading={capacityHeading}
          priceNote={priceNote}
        />
      </div>
    </div>
  );
}