'use client';

import BookingFormProvider from './BookingFormProvider';
import type { PricingRulesInput } from '@/lib/shared/pricing';

interface ProvidersProps {
  children: React.ReactNode;
  pricingRules: PricingRulesInput;
  maxGuests: number;
  totalLabel?: string;
  priceHint?: string;
  formula: string;
  additionalTariffs: { key: string; price: number }[];
}

export default function Providers({
  children,
  pricingRules,
  maxGuests,
  totalLabel,
  priceHint,
  formula,
  additionalTariffs,
}: ProvidersProps) {
  return (
    <BookingFormProvider
      pricingRules={pricingRules}
      maxGuests={maxGuests}
      totalLabel={totalLabel}
      priceHint={priceHint}
      formula={formula}
      additionalTariffs={additionalTariffs}
    >
      {children}
    </BookingFormProvider>
  );
}
