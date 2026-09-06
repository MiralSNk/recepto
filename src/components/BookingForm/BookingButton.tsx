'use client';

import { useBookingForm } from './BookingFormProvider';
import { BookingPrefill } from './BookingForm';

interface BookingButtonProps {
  prefill?: BookingPrefill;
  className?: string;
  children?: React.ReactNode;
}

export default function BookingButton({ prefill, className, children }: BookingButtonProps) {
  const { openBooking } = useBookingForm();

  return (
    <button
      type="button"
      className={className}
      onClick={() => openBooking(prefill)}
    >
      {children || 'Забронировать'}
    </button>
  );
}