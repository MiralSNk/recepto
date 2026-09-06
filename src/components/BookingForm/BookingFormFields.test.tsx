import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BookingFormFields from './BookingFormFields';

const baseProps = {
  name: '',
  phone: '',
  email: '',
  comment: '',
  checkIn: '',
  checkOut: '',
  onNameChange: vi.fn(),
  onPhoneChange: vi.fn(),
  onEmailChange: vi.fn(),
  onCommentChange: vi.fn(),
  onCheckInChange: vi.fn(),
  onCheckOutChange: vi.fn(),
  onAdultsChange: vi.fn(),
};

describe('BookingFormFields — дети', () => {
  it('добавляет ребёнка с возрастом по умолчанию по клику на кнопку', () => {
    const onChildAgesChange = vi.fn();
    render(
      <BookingFormFields
        {...baseProps}
        adults="2"
        childAges={[]}
        onChildAgesChange={onChildAgesChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '+ Добавить ребёнка' }));
    expect(onChildAgesChange).toHaveBeenCalledWith([5]);
  });

  it('блокирует добавление ребёнка при достижении maxGuests', () => {
    const onChildAgesChange = vi.fn();
    render(
      <BookingFormFields
        {...baseProps}
        adults="2"
        childAges={[5]}
        maxGuests={3}
        onChildAgesChange={onChildAgesChange}
      />
    );
    expect(screen.getByRole('button', { name: '+ Добавить ребёнка' })).toBeDisabled();
  });

  it('убирает ребёнка по клику на крестик', () => {
    const onChildAgesChange = vi.fn();
    render(
      <BookingFormFields
        {...baseProps}
        adults="1"
        childAges={[5, 10]}
        onChildAgesChange={onChildAgesChange}
      />
    );
    fireEvent.click(screen.getAllByLabelText('Убрать ребёнка')[0]);
    expect(onChildAgesChange).toHaveBeenCalledWith([10]);
  });

  it('меняет возраст конкретного ребёнка через select', () => {
    const onChildAgesChange = vi.fn();
    render(
      <BookingFormFields
        {...baseProps}
        adults="1"
        childAges={[5, 10]}
        onChildAgesChange={onChildAgesChange}
      />
    );
    fireEvent.change(screen.getByLabelText('Возраст ребёнка 2'), { target: { value: '12' } });
    expect(onChildAgesChange).toHaveBeenCalledWith([5, 12]);
  });
});
