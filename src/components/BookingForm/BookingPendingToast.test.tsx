import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import BookingPendingToast, { type PendingBooking } from './BookingPendingToast';

function makePending(secondsLeft: number): PendingBooking {
  return {
    payload: {},
    endsAt: Date.now() + secondsLeft * 1000,
    timerId: 1,
  };
}

describe('BookingPendingToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ничего не рендерит, если нет отложенной отправки', () => {
    const { container } = render(
      <BookingPendingToast pending={null} onConfirmNow={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('показывает обратный отсчёт и обновляет его каждые 250мс', () => {
    render(
      <BookingPendingToast pending={makePending(90)} onConfirmNow={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText(/1:30/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(31_000);
    });
    expect(screen.getByText(/0:59/)).toBeInTheDocument();
  });

  it('вызывает onCancel по клику «Отменить»', async () => {
    const onCancel = vi.fn();
    render(
      <BookingPendingToast pending={makePending(60)} onConfirmNow={vi.fn()} onCancel={onCancel} />
    );
    act(() => {
      screen.getByRole('button', { name: 'Отменить' }).click();
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('вызывает onConfirmNow по клику «Отправить сейчас»', () => {
    const onConfirmNow = vi.fn();
    render(
      <BookingPendingToast
        pending={makePending(60)}
        onConfirmNow={onConfirmNow}
        onCancel={vi.fn()}
      />
    );
    act(() => {
      screen.getByRole('button', { name: 'Отправить сейчас' }).click();
    });
    expect(onConfirmNow).toHaveBeenCalledTimes(1);
  });
});
