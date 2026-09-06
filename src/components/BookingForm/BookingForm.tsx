'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import Link from 'next/link';
import gsap from 'gsap';
import YandexCaptcha from '@/components/YandexCaptcha/YandexCaptchaLazy';
import { loadBookingDraft, saveBookingDraft } from '@/lib/index.client';
import { usePublicRooms } from '@/hooks';
import RoomSelector from './RoomSelector';
import BookingFormFields from './BookingFormFields';
import { toLocalYMD } from '@/lib/shared/date';
import { calculatePrice, type PricingRulesInput } from '@/lib/shared/pricing';
import { resolveMaxGuests } from '@/lib/shared/guest-limits';
import './BookingForm.scss';

const DEFAULT_CHILD_AGE = 5;

export type BookingPrefill = {
  roomId?: number;
  roomName?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: string;
  children?: string;
  childAges?: number[];
  name?: string;
  phone?: string;
  email?: string;
  comment?: string;
  priceDay?: number;
  priceHalfDay?: number;
};

interface BookingFormProps {
  open: boolean;
  onClose: () => void;
  prefill?: BookingPrefill;
  onScheduleSend: (payload: Record<string, unknown>) => void;
  pricingRules: PricingRulesInput;
  maxGuests: number;
  totalLabel?: string;
  priceHint?: string;
  formula: string;
  additionalTariffs: { key: string; price: number }[];
}

const DEFAULT_TOTAL_LABEL = 'Итого';
const DEFAULT_PRICE_HINT = 'Итоговая цена уже учитывает доплату за дополнительных гостей за все ночи проживания.';

export default function BookingForm({
  open,
  onClose,
  prefill,
  onScheduleSend,
  pricingRules,
  maxGuests,
  totalLabel,
  priceHint,
  formula,
  additionalTariffs,
}: BookingFormProps) {
  // Не дефолтный параметр — getSiteSettings() отдаёт '' для незаполненного
  // ключа, а не undefined, дефолт-параметр это не ловит.
  const resolvedTotalLabel = totalLabel || DEFAULT_TOTAL_LABEL;
  const resolvedPriceHint = priceHint || DEFAULT_PRICE_HINT;
  const [isMounted, setIsMounted] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState('1');
  const [childAges, setChildAges] = useState<number[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  const { rooms, loading: roomsLoading, error: roomsError } = usePublicRooms(open);
  const [selectedRoomId, setSelectedRoomId] = useState<number | ''>('');

  const overlayRef = useRef<HTMLDivElement>(null);
  const animatedRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const prefillRef = useRef(prefill);
  prefillRef.current = prefill;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Автосохранение черновика
  useEffect(() => {
    if (!open || !isMounted) return;
    const timer = window.setTimeout(() => {
      saveBookingDraft({
        name,
        phone,
        email,
        comment,
        checkIn,
        checkOut,
        adults,
        childAges,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [name, phone, email, comment, checkIn, checkOut, adults, childAges, open, isMounted]);

  // Инициализация формы при открытии
  useEffect(() => {
    if (!open || !isMounted) return;

    document.body.style.overflow = 'hidden';
    setStatus('idle');
    setError('');
    setCaptchaToken(null);
    setCaptchaError(false);
    setAgreed(false);
    setHoneypot('');
    setCaptchaKey((k) => k + 1);

    const p = prefillRef.current;
    const draft = loadBookingDraft();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    setCheckIn(p?.checkIn || draft?.checkIn || toLocalYMD(today));
    setCheckOut(p?.checkOut || draft?.checkOut || toLocalYMD(tomorrow));
    setAdults(p?.adults || draft?.adults || '1');
    if (p?.childAges) {
      // Реальные возрасты уже известны (пришли с главной от GuestSelector) —
      // используем их напрямую, не заменяя дефолтным возрастом.
      setChildAges(p.childAges);
    } else {
      const prefillChildCount = p?.children ? Number(p.children) || 0 : null;
      setChildAges(
        prefillChildCount !== null
          ? Array.from({ length: prefillChildCount }, () => DEFAULT_CHILD_AGE)
          : draft?.childAges || []
      );
    }
    setName(p?.name ?? draft?.name ?? '');
    setPhone(p?.phone ?? draft?.phone ?? '');
    setEmail(p?.email ?? draft?.email ?? '');
    setComment(p?.comment ?? draft?.comment ?? '');
    setSelectedRoomId(p?.roomId || '');

    if (formRef.current) {
      gsap.fromTo(
        formRef.current,
        { y: '100%', opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
      );
    }
    if (animatedRef.current) {
      gsap.fromTo(
        animatedRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'transform' }
      );
    }
    if (overlayRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open, isMounted]);

  const handleCloseWithAnimation = useCallback(() => {
    const finish = () => onClose();
    if (formRef.current) {
      gsap.to(formRef.current, {
        y: '100%',
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: finish,
      });
    } else {
      finish();
    }
    if (overlayRef.current) {
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.2 });
    }
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (honeypot.trim() !== '') {
      handleCloseWithAnimation();
      return;
    }
    if (!agreed) {
      setStatus('error');
      setError('Нужно согласие на обработку персональных данных');
      return;
    }
    if (!captchaToken) {
      setCaptchaError(true);
      return;
    }
    if (selectedRoomId === '') {
      setStatus('error');
      setError('Выберите номер');
      return;
    }

    const room = rooms.find((r) => r.id === selectedRoomId);
    if (!room) {
      setStatus('error');
      setError('Выбранный номер не найден');
      return;
    }

    const childrenCount = childAges.length;
    const payload = {
      type: 'booking',
      name,
      phone,
      email: email || undefined,
      roomId: room.id,
      roomName: room.name,
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      adults: adults || undefined,
      children: childrenCount > 0 ? String(childrenCount) : undefined,
      // Возраст каждого ребёнка гость выбирает явно (select в
      // BookingFormFields) — раньше отправлялось только количество, само
      // значение возраста никуда не попадало и терялось для администратора.
      childAges: childrenCount > 0 ? childAges : undefined,
      comment: comment || undefined,
      captchaToken,
      agreed,
      company_website: honeypot,
    };

    saveBookingDraft({
      name,
      phone,
      email,
      comment,
      checkIn,
      checkOut,
      adults,
      childAges,
    });
    onScheduleSend(payload);
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  // Пока номер не выбран — общий сайтовый лимит (проп maxGuests, безопасный
  // дефолт). После выбора — вместимость самого номера (guests + доп. места),
  // если задана, иначе лимит его категории — см. resolveMaxGuests.
  const effectiveMaxGuests = useMemo(() => {
    if (!selectedRoom) return maxGuests;
    return resolveMaxGuests({
      roomGuests: selectedRoom.guests,
      roomExtraCapacity: selectedRoom.extraGuestCapacity,
      categoryMaxGuests: selectedRoom.categoryMaxGuests,
      siteMaxGuestsAbsolute: maxGuests,
    });
  }, [selectedRoom, maxGuests]);

  const priceBreakdown = useMemo(() => {
    if (!selectedRoom || !checkIn || !checkOut) return null;
    const nights = differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
    if (nights <= 0) return null;
    return calculatePrice({
      basePricePerNight: selectedRoom.price_day,
      adults: Number(adults) || 1,
      childAges,
      nights,
      rules: pricingRules,
      additionalTariffs,
      formula,
    });
  }, [selectedRoom, checkIn, checkOut, adults, childAges, pricingRules, additionalTariffs, formula]);

  if (!open || !isMounted) return null;

  return (
    <div
      className="booking-form-overlay"
      ref={overlayRef}
      onClick={handleCloseWithAnimation}
    >
      <div
        ref={formRef}
        className="booking-form"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-form-title"
      >
        <button
          type="button"
          className="booking-form__close"
          onClick={handleCloseWithAnimation}
          aria-label="Закрыть"
        />

        <h2 id="booking-form-title" className="booking-form__title">
          Забронировать
        </h2>

        <RoomSelector
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          onChange={setSelectedRoomId}
        />

        <form className="booking-form__form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="company_website"
            className="booking-form__hp"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            aria-hidden="true"
          />

          <BookingFormFields
            name={name}
            phone={phone}
            email={email}
            comment={comment}
            checkIn={checkIn}
            checkOut={checkOut}
            adults={adults}
            childAges={childAges}
            maxGuests={effectiveMaxGuests}
            onNameChange={setName}
            onPhoneChange={setPhone}
            onEmailChange={setEmail}
            onCommentChange={setComment}
            onCheckInChange={setCheckIn}
            onCheckOutChange={setCheckOut}
            onAdultsChange={setAdults}
            onChildAgesChange={setChildAges}
          />

          {priceBreakdown && selectedRoom && (
            <div className="booking-form__price-summary">
              <div className="booking-form__price-row booking-form__price-row--total">
                <span>{resolvedTotalLabel}</span>
                <span>{priceBreakdown.total.toLocaleString('ru-RU')} ₽</span>
              </div>
              <p className="booking-form__price-hint">{resolvedPriceHint}</p>
              {priceBreakdown.formulaError && (
                <p className="booking-form__price-hint">Используется формула по умолчанию</p>
              )}
              {priceBreakdown.freeChildrenCount > 0 && (
                <p className="booking-form__price-hint">
                  {priceBreakdown.freeChildrenCount === 1 ? 'Один ребёнок' : `${priceBreakdown.freeChildrenCount} детей`} до {pricingRules.childFreeAgeLimit} лет — бесплатно
                </p>
              )}
            </div>
          )}

          <div className="booking-form__captcha">
            <YandexCaptcha
              resetKey={captchaKey}
              onSuccess={(token) => {
                setCaptchaToken(token);
                setCaptchaError(false);
              }}
            />
            {captchaError && (
              <span className="booking-form__captcha-error">
                Подтвердите, что вы не робот
              </span>
            )}
          </div>

          <label className="booking-form__agree">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              required
            />
            <span>
              Я согласен с{' '}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                политикой конфиденциальности
              </Link>{' '}
              и обработкой персональных данных
            </span>
          </label>

          {status === 'error' && (
            <div className="booking-form__error-box" role="alert">
              <span className="booking-form__error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="booking-form__btn">
            Отправить заявку
          </button>

          <p className="booking-form__note">
            Это заявка на бронирование. В ближайшее время администратор отеля
            свяжется с вами по указанному номеру телефона.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: 'var(--color-text-muted)',
              textAlign: 'center',
            }}
          >
            После отправки будет 2 минуты, чтобы отменить заявку
          </p>
        </form>
      </div>
    </div>
  );
}