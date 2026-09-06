'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import BookingForm, { type BookingPrefill } from './BookingForm';
import BookingPendingToast, { type PendingBooking } from './BookingPendingToast';
import { clearBookingDraft } from '@/lib/index.client';
import type { PricingRulesInput } from '@/lib/shared/pricing';

type Ctx = {
  openBooking: (prefill?: BookingPrefill) => void;
  closeBooking: () => void;
};

const BookingCtx = createContext<Ctx | null>(null);

export function useBookingForm() {
  const ctx = useContext(BookingCtx);
  if (!ctx) throw new Error('useBookingForm outside provider');
  return ctx;
}

async function postMail(payload: Record<string, unknown>) {
  const res = await fetch('/api/mail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка отправки');
  return data;
}

interface BookingFormProviderProps {
  children: ReactNode;
  pricingRules: PricingRulesInput;
  maxGuests: number;
  totalLabel?: string;
  priceHint?: string;
  formula: string;
  additionalTariffs: { key: string; price: number }[];
}

export default function BookingFormProvider({
  children,
  pricingRules,
  maxGuests,
  totalLabel,
  priceHint,
  formula,
  additionalTariffs,
}: BookingFormProviderProps) {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<BookingPrefill | undefined>();
  const [pending, setPending] = useState<PendingBooking | null>(null);
  const pendingRef = useRef<PendingBooking | null>(null);

  const clearPendingTimer = useCallback(() => {
    if (pendingRef.current?.timerId) {
      window.clearTimeout(pendingRef.current.timerId);
    }
    pendingRef.current = null;
    setPending(null);
  }, []);

  const openBooking = useCallback((p?: BookingPrefill) => {
    setPrefill(p);
    setOpen(true);
  }, []);

  const closeBooking = useCallback(() => {
    setOpen(false);
  }, []);

  // Отложенная отправка (2 минуты на отмену) держится только на setTimeout
  // в памяти вкладки — нет ни localStorage, ни beforeunload. Закрытие вкладки,
  // хард-рефреш или анмаунт провайдера во время отсчёта тихо теряют заявку,
  // хотя пользователю обещан таймер в BookingPendingToast. См. AUDIT.md.
  const scheduleSend = useCallback(
    (payload: Record<string, unknown>) => {
      clearPendingTimer();
      const endsAt = Date.now() + 120_000;
      const timerId = window.setTimeout(async () => {
        try {
          await postMail(payload);
          clearBookingDraft();
        } catch (e) {
          console.error(e);
          alert(e instanceof Error ? e.message : 'Не удалось отправить заявку');
        } finally {
          pendingRef.current = null;
          setPending(null);
        }
      }, 120_000);

      const entry: PendingBooking = { payload, endsAt, timerId };
      pendingRef.current = entry;
      setPending(entry);
      setOpen(false);
    },
    [clearPendingTimer]
  );

  const confirmNow = useCallback(async () => {
    const cur = pendingRef.current;
    if (!cur) return;
    window.clearTimeout(cur.timerId);
    try {
      await postMail(cur.payload);
      clearBookingDraft();
      alert('Заявка отправлена');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка отправки');
    } finally {
      pendingRef.current = null;
      setPending(null);
    }
  }, []);

  const cancelPending = useCallback(() => {
    clearPendingTimer();
  }, [clearPendingTimer]);

  return (
    <BookingCtx.Provider value={{ openBooking, closeBooking }}>
      {children}
      <BookingForm
        open={open}
        onClose={closeBooking}
        prefill={prefill}
        onScheduleSend={scheduleSend}
        pricingRules={pricingRules}
        maxGuests={maxGuests}
        totalLabel={totalLabel}
        priceHint={priceHint}
        formula={formula}
        additionalTariffs={additionalTariffs}
      />
      <BookingPendingToast
        pending={pending}
        onConfirmNow={confirmNow}
        onCancel={cancelPending}
      />
    </BookingCtx.Provider>
  );
}