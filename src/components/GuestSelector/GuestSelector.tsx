'use client';

import { useState, useRef, useEffect } from 'react';
import './GuestSelector.scss';
import { Guests } from '@/types';
import Portal from '../Portal/Portal';

interface GuestSelectorProps {
  guests: Guests;
  onChange: (guests: Guests) => void;
  childAges: number[];
  onChildAgesChange: (ages: number[]) => void;
  maxTotal?: number;
}

const DEFAULT_CHILD_AGE = 5;

const pluralize = (count: number, one: string, few: string, many: string) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} ${one}`;
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${count} ${few}`;
  return `${count} ${many}`;
};

const GuestsSelector = ({
  guests,
  onChange,
  childAges,
  onChildAgesChange,
  maxTotal = 10,
}: GuestSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const totalGuests = guests.adults + guests.children;
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, { passive: true });
      window.addEventListener('resize', updatePosition, { passive: true });
      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  let guestsLabel = '';
  if (totalGuests === 0) {
    guestsLabel = 'Гости';
  } else {
    const parts = [];
    if (guests.adults > 0) {
      parts.push(pluralize(guests.adults, 'взрослый', 'взрослых', 'взрослых'));
    }
    if (guests.children > 0) {
      parts.push(pluralize(guests.children, 'ребёнок', 'ребёнка', 'детей'));
    }
    guestsLabel = parts.join(', ');
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideContainer = containerRef.current && containerRef.current.contains(target);
      const isInsidePortal = portalRef.current && portalRef.current.contains(target);

      if (!isInsideContainer && !isInsidePortal) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateAdults = (delta: number) => {
    const adults = Math.max(1, guests.adults + delta);
    if (adults + guests.children > maxTotal) return;
    onChange({ ...guests, adults });
  };

  // onChildAgesChange у родителя сам выводит и сохраняет количество детей
  // (ages.length) вместе с возрастами одним обновлением — отдельный onChange
  // здесь был бы вторым, гоняющимся за тем же состоянием обновлением URL.
  const addChild = () => {
    if (totalGuests >= maxTotal) return;
    onChildAgesChange([...childAges, DEFAULT_CHILD_AGE]);
  };

  // Убираем сразу, синхронно — как «Взрослые». Анимировать исчезновение через
  // gsap-onComplete раньше означало, что состояние (URL) обновлялось только
  // спустя 250мс после клика, а не по клику — визуально минус «не работал».
  const removeChild = (index: number) => {
    onChildAgesChange(childAges.filter((_, i) => i !== index));
  };

  const setChildAge = (index: number, age: number) => {
    onChildAgesChange(childAges.map((a, i) => (i === index ? age : a)));
  };

  return (
    <div className="guest-selector" ref={containerRef}>
      <button
        className="guest-selector__btn"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="guest-selector__btn-label">Гости</span>
        <span className="guest-selector__btn-text">{guestsLabel}</span>
      </button>
      {isOpen && (
        <Portal>
          <div
            ref={portalRef}
            className="guest-selector__dropdown--portal"
            style={{
              top: position.top + 'px',
              left: position.left + 'px',
              width: position.width + 'px',
            }}
          >
            <div className="guest-selector__item">
              <div className="guest-selector__item-info">
                <span className="guest-selector__item-title">Взрослые</span>
              </div>
              <div className="guest-selector__counter">
                <button
                  className="guest-selector__counter-btn"
                  onClick={() => updateAdults(-1)}
                  disabled={guests.adults <= 1}
                  aria-label="Уменьшить количество взрослых"
                />
                <span className="guest-selector__count">{guests.adults}</span>
                <button
                  className="guest-selector__counter-btn guest-selector__counter-btn--plus"
                  onClick={() => updateAdults(1)}
                  disabled={totalGuests >= maxTotal}
                  aria-label="Увеличить количество взрослых"
                />
              </div>
            </div>
            <div className="guest-selector__item">
              <div className="guest-selector__item-info">
                <span className="guest-selector__item-title">Дети</span>
                <span className="guest-selector__item-hint">с указанием возраста</span>
              </div>
              <div className="guest-selector__counter">
                <button
                  className="guest-selector__counter-btn"
                  onClick={() => removeChild(childAges.length - 1)}
                  disabled={childAges.length === 0}
                  aria-label="Уменьшить количество детей"
                />
                <span className="guest-selector__count">{childAges.length}</span>
                <button
                  className="guest-selector__counter-btn guest-selector__counter-btn--plus"
                  onClick={addChild}
                  disabled={totalGuests >= maxTotal}
                  aria-label="Увеличить количество детей"
                />
              </div>
            </div>

            {childAges.length > 0 && (
              <div className="guest-selector__children">
                {childAges.map((age, idx) => (
                  <div key={idx} className="guest-selector__child-row guest-selector__child-row--enter">
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
                      className="guest-selector__child-remove"
                      onClick={() => removeChild(idx)}
                      aria-label="Убрать ребёнка"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Portal>
      )}
    </div>
  );
};

export default GuestsSelector;