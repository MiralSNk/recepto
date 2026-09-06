'use client';

import { useEffect, useRef, useState } from 'react';

export interface PublicRoom {
  id: number;
  name: string;
  price_day: number;
  price_half_day?: number;
  guests?: number | null;
  extraGuestCapacity?: number;
  categoryMaxGuests?: number | null;
}

/**
 * Загружает список доступных номеров для формы бронирования.
 * enabled=false откладывает запрос (например, пока модалка брони не открыта) —
 * иначе хук фетчил бы список номеров на каждой загрузке любой страницы сайта,
 * т.к. BookingForm смонтирован в корневом layout всегда, а не только при открытии.
 */
export function usePublicRooms(enabled = true) {
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!enabled || fetchedRef.current) return;
    fetchedRef.current = true;
    fetch('/api/rooms/public')
      .then((res) => {
        if (!res.ok) throw new Error('Не удалось загрузить номера');
        return res.json();
      })
      .then((data) => {
        setRooms(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки номеров');
      })
      .finally(() => setLoading(false));
  }, [enabled]);

  return { rooms, loading, error };
}