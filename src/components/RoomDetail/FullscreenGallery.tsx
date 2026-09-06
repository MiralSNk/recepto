'use client';

/**
 * Полноэкранная галерея номера.
 * Слайдер — useGalleryTrack; вход/выход оверлея — GSAP.
 */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import Image from 'next/image';
import {
  useGalleryTrack,
  buildClonedSlides,
} from '@/hooks/useGalleryTrack';
import './RoomDetail.scss';

export interface FullscreenGalleryProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function FullscreenGallery({
  images,
  initialIndex,
  onClose,
}: FullscreenGalleryProps) {
  const imgs = images?.length ? images : [];
  const cloned = buildClonedSlides(imgs);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    if (overlayRef.current) {
      gsap.to(overlayRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  };

  const {
    trackRef,
    containerRef,
    realIndex,
    realCount,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onClickGallery,
  } = useGalleryTrack({
    length: imgs.length,
    loop: true,
    initialRealIndex: initialIndex,
    onCenterClick: () => handleClose(),
  });

  useEffect(() => {
    if (!overlayRef.current) return;
    gsap.fromTo(
      overlayRef.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }
    );
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={overlayRef}
      className="fullscreen-gallery"
      onClick={onClickGallery}
      onMouseDown={onMouseDown}
    >
      <button
        type="button"
        className="fullscreen-gallery__back"
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        aria-label="Назад"
      />

      <div
        className="fullscreen-gallery__content"
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fullscreen-gallery__track" ref={trackRef}>
          {cloned.map((src, idx) => (
            <div key={`${src}-${idx}`} className="fullscreen-gallery__slide">
              <Image
                src={src}
                fill
                alt={`Фото ${idx + 1}`}
                className="fullscreen-gallery__img"
                priority={idx <= 1}
                draggable={false}
                sizes="100vw"
              />
            </div>
          ))}
        </div>

        {realCount > 1 && (
          <div className="fullscreen-gallery__dots">
            {imgs.map((_, idx) => (
              <span
                key={idx}
                className={
                  idx === realIndex
                    ? 'fullscreen-gallery__dot fullscreen-gallery__dot--active'
                    : 'fullscreen-gallery__dot'
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}