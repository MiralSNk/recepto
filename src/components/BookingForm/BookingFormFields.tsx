'use client';

import DatePicker from 'react-datepicker';
import { ru } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

interface BookingFormFieldsProps {
  name: string;
  phone: string;
  email: string;
  comment: string;
  checkIn: string;
  checkOut: string;
  adults: string;
  childAges: number[];
  maxGuests?: number;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
  onAdultsChange: (value: string) => void;
  onChildAgesChange: (ages: number[]) => void;
}

const DEFAULT_CHILD_AGE = 5;

/**
 * Все поля ввода для формы бронирования.
 */
export default function BookingFormFields({
  name,
  phone,
  email,
  comment,
  checkIn,
  checkOut,
  adults,
  childAges,
  maxGuests = 10,
  onNameChange,
  onPhoneChange,
  onEmailChange,
  onCommentChange,
  onCheckInChange,
  onCheckOutChange,
  onAdultsChange,
  onChildAgesChange,
}: BookingFormFieldsProps) {
  const totalGuests = (Number(adults) || 0) + childAges.length;

  const addChild = () => {
    if (totalGuests >= maxGuests) return;
    onChildAgesChange([...childAges, DEFAULT_CHILD_AGE]);
  };

  const removeChild = (index: number) => {
    onChildAgesChange(childAges.filter((_, i) => i !== index));
  };

  const setChildAge = (index: number, age: number) => {
    onChildAgesChange(childAges.map((a, i) => (i === index ? age : a)));
  };
  return (
    <div className="booking-form__fields">
      <label>
        <span>Имя *</span>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
          maxLength={100}
          autoComplete="name"
          style={{ fontSize: 16 }}
        />
      </label>
      <label>
        <span>Телефон *</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          required
          maxLength={30}
          placeholder="+7 ..."
          autoComplete="tel"
          style={{ fontSize: 16 }}
        />
      </label>
      <label>
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          maxLength={120}
          autoComplete="email"
          style={{ fontSize: 16 }}
        />
      </label>

      <div className="booking-form__row">
        <label>
          <span>Заезд</span>
          <DatePicker
            selected={checkIn ? parseISO(checkIn) : null}
            onChange={(date: Date | null) =>
              onCheckInChange(date ? format(date, 'yyyy-MM-dd') : '')
            }
            dateFormat="dd.MM.yyyy"
            locale={ru}
            placeholderText="ДД.ММ.ГГГГ"
            className="booking-form__input"
            wrapperClassName="booking-form__date-wrapper"
          />
        </label>
        <label>
          <span>Выезд</span>
          <DatePicker
            selected={checkOut ? parseISO(checkOut) : null}
            onChange={(date: Date | null) =>
              onCheckOutChange(date ? format(date, 'yyyy-MM-dd') : '')
            }
            dateFormat="dd.MM.yyyy"
            locale={ru}
            placeholderText="ДД.ММ.ГГГГ"
            className="booking-form__input"
            wrapperClassName="booking-form__date-wrapper"
          />
        </label>
      </div>

      <div className="booking-form__row">
        <label>
          <span>Взрослые</span>
          <input
            type="number"
            min={1}
            max={maxGuests}
            value={adults}
            onChange={(e) => onAdultsChange(e.target.value)}
            style={{ fontSize: 16 }}
          />
        </label>
      </div>

      <div className="booking-form__children">
        <span className="booking-form__children-label">Дети</span>
        {childAges.map((age, idx) => (
          <div key={idx} className="booking-form__child-row">
            <select
              value={age}
              onChange={(e) => setChildAge(idx, Number(e.target.value))}
              aria-label={`Возраст ребёнка ${idx + 1}`}
            >
              {Array.from({ length: 18 }, (_, i) => i).map((a) => (
                <option key={a} value={a}>
                  {a === 0 ? 'до 1 года' : `${a} лет`}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="booking-form__child-remove"
              onClick={() => removeChild(idx)}
              aria-label="Убрать ребёнка"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="booking-form__child-add"
          onClick={addChild}
          disabled={totalGuests >= maxGuests}
        >
          + Добавить ребёнка
        </button>
      </div>

      <label>
        <span>Комментарий</span>
        <textarea
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          rows={3}
          maxLength={1000}
          style={{ fontSize: 16 }}
        />
      </label>
    </div>
  );
}