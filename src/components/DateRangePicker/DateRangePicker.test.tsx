import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { format } from 'date-fns';
import DateRangePicker from './DateRangePicker';

// Без checkIn/checkOut компонент после маунта сам подставляет
// сегодня → завтра (не оставляет пустое поле) — тот же расчёт, что в самом
// компоненте, чтобы тест не был завязан на текущую дату жёстко.
function defaultRangeText(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return `${format(today, 'dd.MM.yyyy')} — ${format(tomorrow, 'dd.MM.yyyy')}`;
}

describe('DateRangePicker', () => {
  it('без выбранных дат подставляет сегодня → завтра', () => {
    render(<DateRangePicker checkIn={null} checkOut={null} onDateChange={vi.fn()} />);
    expect(screen.getByText(defaultRangeText())).toBeInTheDocument();
  });

  it('открывает календарь по клику на поле и закрывает по кнопке', () => {
    render(<DateRangePicker checkIn={null} checkOut={null} onDateChange={vi.fn()} />);

    expect(screen.queryByLabelText('Закрыть календарь')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(defaultRangeText()));
    expect(screen.getByLabelText('Закрыть календарь')).toBeInTheDocument();
    expect(screen.getByText('Выберите дату заезда, затем выезда')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Закрыть календарь'));
    expect(screen.queryByLabelText('Закрыть календарь')).not.toBeInTheDocument();
  });

  it('отображает уже выбранный диапазон дат', () => {
    render(
      <DateRangePicker
        checkIn={new Date(2026, 8, 10)}
        checkOut={new Date(2026, 8, 12)}
        onDateChange={vi.fn()}
      />
    );
    expect(screen.getByText('10.09.2026 — 12.09.2026')).toBeInTheDocument();
  });
});
