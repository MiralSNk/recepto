'use client';

import { useState, useEffect, useRef } from 'react';
import { DateRange, Range, RangeKeyDict } from 'react-date-range';
import { ru } from 'date-fns/locale';
import { format } from 'date-fns';
import CalendarIcon from '@/assets/icons/calendar.svg';
import Portal from '@/components/Portal/Portal';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import './DateRangePicker.scss';

interface DateRangePickerProps {
  checkIn: Date | null;
  checkOut: Date | null;
  onDateChange: (dates: { checkIn: Date; checkOut: Date }) => void;
}

const DateRangePicker = ({ checkIn, checkOut, onDateChange }: DateRangePickerProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<0 | 1>(0);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setStartDate(checkIn ?? today);
    setEndDate(checkOut ?? tomorrow);
  }, [isMounted, checkIn, checkOut]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideContainer = containerRef.current && containerRef.current.contains(target);
      const isInsidePortal = portalRef.current && portalRef.current.contains(target);
      if (!isInsideContainer && !isInsidePortal) {
        setIsOpen(false);
        stepRef.current = 0;
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (ranges: RangeKeyDict) => {
    const selection = ranges.selection as Range;
    const clicked = selection.startDate;
    if (!clicked) return;
    if (stepRef.current === 0) {
      setStartDate(clicked);
      setEndDate(undefined);
      stepRef.current = 1;
      return;
    }
    let finalStart = startDate ?? clicked;
    let finalEnd = selection.endDate ?? clicked;
    if (finalEnd < finalStart) {
      [finalStart, finalEnd] = [finalEnd, finalStart];
    }
    if (finalEnd.getTime() === finalStart.getTime()) {
      finalEnd = new Date(finalStart);
      finalEnd.setDate(finalEnd.getDate() + 1);
    }
    setStartDate(finalStart);
    setEndDate(finalEnd);
    onDateChange({ checkIn: finalStart, checkOut: finalEnd });
    stepRef.current = 0;
  };

  const openCalendar = () => {
    setIsOpen(true);
    stepRef.current = 0;
  };

  const closeCalendar = () => {
    setIsOpen(false);
    stepRef.current = 0;
  };

  let displayText = 'Выберите даты';
  if (isMounted && startDate && endDate) {
    displayText = `${format(startDate, 'dd.MM.yyyy')} — ${format(endDate, 'dd.MM.yyyy')}`;
  } else if (isMounted && startDate && !endDate) {
    displayText = `${format(startDate, 'dd.MM.yyyy')} — …`;
  }

  const rangeEnd = endDate ?? startDate ?? new Date();

  return (
    <div className="date-range-picker" ref={containerRef}>
      <div className="date-range-picker__field" onClick={openCalendar}>
        <div className="date-range-picker__label">Въезд — Выезд</div>
        <div className="date-range-picker__value">
          <CalendarIcon className="date-range-picker__icon" />
          <span suppressHydrationWarning>{displayText}</span>
        </div>
      </div>

      {isMounted && isOpen && (
        <Portal>
          <div
            ref={portalRef}
            className="date-range-picker__dropdown--portal"
            style={{
              top: position.top + 'px',
              left: position.left + 'px',
              width: position.width + 'px',
            }}
          >
            <div className="date-range-picker__dropdown-head">
              <span className="date-range-picker__hint">
                {stepRef.current === 0 || !endDate
                  ? 'Выберите дату заезда, затем выезда'
                  : 'Можно выбрать даты заново'}
              </span>
              <button
                type="button"
                className="date-range-picker__close"
                onClick={closeCalendar}
                aria-label="Закрыть календарь"
              />
            </div>
            <DateRange
              ranges={[
                {
                  startDate: startDate || new Date(),
                  endDate: rangeEnd,
                  key: 'selection',
                },
              ]}
              onChange={handleSelect}
              locale={ru}
              dateDisplayFormat="dd.MM.yyyy"
              minDate={new Date()}
              showDateDisplay={false}
              direction="horizontal"
              rangeColors={['var(--color-pr-brown)']}
              color="var(--color-pr-gold)"
              moveRangeOnFirstSelection={false}
              retainEndDateOnFirstSelection={false}
              preventSnapRefocus
            />
          </div>
        </Portal>
      )}
    </div>
  );
};

export default DateRangePicker;