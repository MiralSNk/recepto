'use client';

import { useEffect, useState } from 'react';
import './BookingPendingToast.scss';

export type PendingBooking = {
  payload: Record<string, unknown>;
  endsAt: number;
  timerId: number;
};

interface Props {
  pending: PendingBooking | null;
  onConfirmNow: () => void;
  onCancel: () => void;
}

export default function BookingPendingToast({
  pending,
  onConfirmNow,
  onCancel,
}: Props) {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!pending) return;
    const tick = () => {
      setLeft(Math.max(0, Math.ceil((pending.endsAt - Date.now()) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => clearInterval(id);
  }, [pending]);

  if (!pending) return null;

  const mm = String(Math.floor(left / 60)).padStart(1, '0');
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div className="booking-pending-toast" role="status">
      <div className="booking-pending-toast__text">
        <strong>Заявка будет отправлена через {mm}:{ss}</strong>
        <span>
          Можно отменить. После отправки отменить через сайт нельзя — только
          по телефону.
        </span>
      </div>
      <div className="booking-pending-toast__actions">
        <button type="button" className="booking-pending-toast__cancel" onClick={onCancel}>
          Отменить
        </button>
        <button type="button" className="booking-pending-toast__send" onClick={onConfirmNow}>
          Отправить сейчас
        </button>
      </div>
    </div>
  );
}