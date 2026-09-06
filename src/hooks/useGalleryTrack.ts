'use client';

/**
 * Хук бесконечной (или обычной) галереи на GSAP.
 * Используется в RoomDetail, FullscreenGallery, RoomCard.
 *
 * loop=true → клоны [last, ...items, first], старт с индекса 1.
 * Зоны клика: левые/правые 22% — prev/next, центр — onCenterClick.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export type GalleryTrackOptions = {
  length: number;
  loop?: boolean;
  initialRealIndex?: number;
  onCenterClick?: (realIndex: number) => void;
};

export function buildClonedSlides<T>(items: T[]): T[] {
  if (items.length <= 1) return items;
  return [items[items.length - 1], ...items, items[0]];
}

export function useGalleryTrack({
  length,
  loop = false,
  initialRealIndex = 0,
  onCenterClick,
}: GalleryTrackOptions) {
  const realCount = Math.max(length, 0);
  const totalSlides = loop && realCount > 1 ? realCount + 2 : Math.max(realCount, 1);

  const startIndex =
    loop && realCount > 1
      ? 1 + Math.max(0, Math.min(realCount - 1, initialRealIndex))
      : Math.max(0, Math.min(Math.max(realCount - 1, 0), initialRealIndex));

  const [index, setIndex] = useState(startIndex);
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<gsap.core.Tween | null>(null);
  const startX = useRef(0);
  const currentTranslate = useRef(0);
  const isDragging = useRef(false);
  const pointerType = useRef<'touch' | 'mouse' | 'unknown'>('unknown');
  const onCenterClickRef = useRef(onCenterClick);
  onCenterClickRef.current = onCenterClick;

  const getWidth = () => containerRef.current?.offsetWidth || 1;

  const setInstant = useCallback((i: number) => {
    animRef.current?.kill();
    const x = -i * getWidth();
    currentTranslate.current = x;
    if (trackRef.current) gsap.set(trackRef.current, { x });
    setIndex(i);
  }, []);

  const animateTo = useCallback(
    (i: number) => {
      animRef.current?.kill();
      const x = -i * getWidth();
      currentTranslate.current = x;
      setIndex(i);
      animRef.current = gsap.to(trackRef.current, {
        x,
        duration: 0.3,
        ease: 'power2.out',
        onComplete: () => {
          if (!loop || realCount <= 1) return;
          if (i === 0) setInstant(realCount);
          else if (i === totalSlides - 1) setInstant(1);
        },
      });
    },
    [loop, realCount, totalSlides, setInstant]
  );

  // Пересчитываем стартовый индекс только когда меняется набор слайдов или
  // режим loop — initialRealIndex/setInstant намеренно не в deps, иначе любой
  // ререндер с новым инстансом этих значений дёргал бы галерею обратно к старту.
  useEffect(() => {
    const next =
      loop && realCount > 1
        ? 1 + Math.max(0, Math.min(realCount - 1, initialRealIndex))
        : 0;
    setInstant(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length, loop]);

  useEffect(() => {
    const onResize = () => setInstant(index);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, setInstant]);

  const realIndex =
    loop && realCount > 1
      ? index === 0
        ? realCount - 1
        : index === totalSlides - 1
          ? 0
          : index - 1
      : Math.min(index, Math.max(realCount - 1, 0));

  const goReal = useCallback(
    (real: number) => {
      if (realCount <= 0) return;
      const clamped = Math.max(0, Math.min(realCount - 1, real));
      if (loop && realCount > 1) animateTo(clamped + 1);
      else animateTo(clamped);
    },
    [animateTo, loop, realCount]
  );

  const goNext = useCallback(() => {
    if (realCount <= 1) return;
    if (loop) animateTo(index + 1);
    else goReal(realIndex + 1);
  }, [realCount, loop, animateTo, index, goReal, realIndex]);

  const goPrev = useCallback(() => {
    if (realCount <= 1) return;
    if (loop) animateTo(index - 1);
    else goReal(realIndex - 1);
  }, [realCount, loop, animateTo, index, goReal, realIndex]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (realCount <= 1) return;
    pointerType.current = 'touch';
    animRef.current?.kill();
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || pointerType.current !== 'touch') return;
    const dx = e.touches[0].clientX - startX.current;
    const x = -index * getWidth() + dx;
    currentTranslate.current = x;
    gsap.set(trackRef.current, { x });
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current || pointerType.current !== 'touch') return;
    isDragging.current = false;
    const dx = e.changedTouches[0].clientX - startX.current;
    const threshold = getWidth() * 0.2;
    if (Math.abs(dx) > threshold) {
      if (dx < 0) goNext();
      else goPrev();
    } else {
      animateTo(index);
    }
  };

  // Мышь: тот же drag-to-swipe, что и на тачскрине (onTouchMove/onTouchEnd
  // выше), только через window-level move/up — движение мыши обычно уходит
  // за пределы самого элемента галереи, и React-обработчик прямо на элементе
  // (onMouseMove) его бы не поймал.
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || realCount <= 1) return;
    pointerType.current = 'mouse';
    animRef.current?.kill();
    startX.current = e.clientX;
    isDragging.current = false;

    const handleMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX.current;
      if (!isDragging.current && Math.abs(dx) > 4) {
        isDragging.current = true;
      }
      if (!isDragging.current) return;
      const x = -index * getWidth() + dx;
      currentTranslate.current = x;
      gsap.set(trackRef.current, { x });
    };

    const handleUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      if (!isDragging.current) return;
      isDragging.current = false;
      const dx = ev.clientX - startX.current;
      const threshold = getWidth() * 0.2;
      if (Math.abs(dx) > threshold) {
        if (dx < 0) goNext();
        else goPrev();
      } else {
        animateTo(index);
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const onClickGallery = (e: React.MouseEvent) => {
    if (pointerType.current === 'touch') return;
    const dx = Math.abs(e.clientX - startX.current);
    if (dx > 8) return;

    const el = containerRef.current;
    if (!el || realCount === 0) return;
    const rel = (e.clientX - el.getBoundingClientRect().left) / el.offsetWidth;

    if (realCount > 1 && rel < 0.22) {
      e.preventDefault();
      goPrev();
      return;
    }
    if (realCount > 1 && rel > 0.78) {
      e.preventDefault();
      goNext();
      return;
    }

    onCenterClickRef.current?.(realIndex);
  };

  return {
    trackRef,
    containerRef,
    index,
    realIndex,
    totalSlides,
    realCount,
    goReal,
    goNext,
    goPrev,
    animateTo,
    setInstant,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onClickGallery,
  };
}