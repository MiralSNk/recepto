import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BookingForm from './BookingForm';
import { DEFAULT_FORMULA } from '@/lib/shared/formula';

vi.mock('@/components/YandexCaptcha/YandexCaptchaLazy', () => ({
  default: () => <div data-testid="captcha-stub" />,
}));

vi.mock('@/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks')>();
  return {
    ...actual,
    usePublicRooms: () => ({
      // Вместимость (guests+extraGuestCapacity=7) должна вмещать сценарий
      // заказчика ниже (3 взрослых + 2 детей = 5), но всё ещё быть меньше
      // сайтового maxGuests=10 — иначе тест на лимит по номеру ничего не
      // проверял бы (см. describe «лимит гостей после выбора номера»).
      rooms: [
        { id: 1, name: 'Семейный номер', price: 3000, price_day: 3000, guests: 5, extraGuestCapacity: 2 },
      ],
      loading: false,
      error: null,
    }),
  };
});

const pricingRules = { childFreeAgeLimit: 7, secondGuestPrice: 400, extraGuestPrice: 800 };

function selectRoom() {
  fireEvent.change(screen.getByLabelText('Номер'), { target: { value: '1' } });
}

// Числа с ценой рендерятся как {value}{' '}₽ — два соседних текстовых узла
// внутри одного <span>. getByText сравнивает по отдельному текстовому узлу,
// поэтому не находит "3 000 ₽" целиком — проверяем через textContent контейнера.
const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;

describe('BookingForm — сводка цены', () => {
  it('один взрослый, одна ночь — итог равен цене номера, без разбивки по строкам', () => {
    const { container } = render(
      <BookingForm
        open
        onClose={vi.fn()}
        onScheduleSend={vi.fn()}
        pricingRules={pricingRules}
        maxGuests={10}
        formula={DEFAULT_FORMULA}
        additionalTariffs={[]}
      />
    );
    selectRoom();

    expect(screen.getByText('Итого')).toBeInTheDocument();
    expect(container.textContent).toContain(rub(3000));
    // Заказчик явно попросил не показывать разбивку расчёта построчно
    expect(container.textContent).not.toContain('Доплата за 2-го гостя');
    expect(container.textContent).not.toContain('Доплата за 3-го');
    expect(container.textContent).not.toContain('Цена номера');
    expect(container.textContent).not.toMatch(/Завтрак/);
  });

  it('пример заказчика: 3 ночи, 3 взрослых + ребёнок 11 лет + ребёнок 5 лет → (X+400+800+0+800)×3', () => {
    const { container } = render(
      <BookingForm
        open
        onClose={vi.fn()}
        onScheduleSend={vi.fn()}
        pricingRules={pricingRules}
        maxGuests={10}
        formula={DEFAULT_FORMULA}
        additionalTariffs={[]}
        prefill={{ checkIn: '2026-01-01', checkOut: '2026-01-04' }}
      />
    );
    selectRoom();

    fireEvent.change(screen.getByLabelText('Взрослые'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Добавить ребёнка' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Добавить ребёнка' }));
    fireEvent.change(screen.getByLabelText('Возраст ребёнка 1'), { target: { value: '11' } });
    // второй ребёнок остаётся с дефолтным возрастом 5 (младше порога — бесплатен)

    // (3000 + 400 + 800 + 0 + 800) × 3 = 15 000
    expect(container.textContent).toContain(rub(15000));
    expect(container.textContent).not.toContain('Доплата за 2-го гостя');
    expect(container.textContent).toMatch(/Один ребёнок\s*до\s*7\s*лет\s*—\s*бесплатно/);
    expect(container.textContent).not.toMatch(/Завтрак/);
  });

  it('по умолчанию показывает «Итого» и пояснение про доплату за гостей', () => {
    render(
      <BookingForm
        open
        onClose={vi.fn()}
        onScheduleSend={vi.fn()}
        pricingRules={pricingRules}
        maxGuests={10}
        formula={DEFAULT_FORMULA}
        additionalTariffs={[]}
      />
    );
    selectRoom();
    expect(screen.getByText('Итого')).toBeInTheDocument();
    expect(screen.getByText(/доплату за дополнительных гостей/)).toBeInTheDocument();
  });

  it('падает на дефолты и при пустой строке в пропсах (getSiteSettings отдаёт "" для незаполненного ключа)', () => {
    render(
      <BookingForm
        open
        onClose={vi.fn()}
        onScheduleSend={vi.fn()}
        pricingRules={pricingRules}
        maxGuests={10}
        formula={DEFAULT_FORMULA}
        additionalTariffs={[]}
        totalLabel=""
        priceHint=""
      />
    );
    selectRoom();
    expect(screen.getByText('Итого')).toBeInTheDocument();
    expect(screen.getByText(/доплату за дополнительных гостей/)).toBeInTheDocument();
  });

  it('использует переданные из админки название итога и пояснение вместо дефолтных', () => {
    render(
      <BookingForm
        open
        onClose={vi.fn()}
        onScheduleSend={vi.fn()}
        pricingRules={pricingRules}
        maxGuests={10}
        formula={DEFAULT_FORMULA}
        additionalTariffs={[]}
        totalLabel="К оплате"
        priceHint="Своё пояснение о расчёте"
      />
    );
    selectRoom();
    expect(screen.getByText('К оплате')).toBeInTheDocument();
    expect(screen.getByText('Своё пояснение о расчёте')).toBeInTheDocument();
    expect(screen.queryByText('Итого')).not.toBeInTheDocument();
  });

  it('доп. тариф, включённый через кастомную формулу, учитывается в итоге', () => {
    const { container } = render(
      <BookingForm
        open
        onClose={vi.fn()}
        onScheduleSend={vi.fn()}
        pricingRules={pricingRules}
        maxGuests={10}
        formula="base + pet_deposit"
        additionalTariffs={[{ key: 'pet_deposit', price: 500 }]}
      />
    );
    selectRoom();
    // один взрослый, одна ночь: 3000 (база) + 500 (доп. тариф) = 3500
    expect(container.textContent).toContain(rub(3500));
  });
});

// Регрессия: пикер гостей в модалке брони раньше знал только общий сайтовый
// лимит (maxGuests), даже после выбора конкретного номера — можно было
// набрать больше гостей, чем номер физически вмещает. Теперь после выбора
// номера потолок пересчитывается через resolveMaxGuests (вместимость номера
// главнее сайтового лимита, если задана).
describe('BookingForm — лимит гостей после выбора номера', () => {
  it('после выбора номера потолок «Взрослые» — вместимость номера (guests+extra), а не сайтовый maxGuests', () => {
    render(
      <BookingForm
        open
        onClose={vi.fn()}
        onScheduleSend={vi.fn()}
        pricingRules={pricingRules}
        maxGuests={10}
        formula={DEFAULT_FORMULA}
        additionalTariffs={[]}
      />
    );
    selectRoom();
    // Мокнутый номер: guests=5, extraGuestCapacity=2 → вместимость 7.
    expect(screen.getByLabelText('Взрослые')).toHaveAttribute('max', '7');
  });

  it('до выбора номера потолок — общий сайтовый maxGuests', () => {
    render(
      <BookingForm
        open
        onClose={vi.fn()}
        onScheduleSend={vi.fn()}
        pricingRules={pricingRules}
        maxGuests={10}
        formula={DEFAULT_FORMULA}
        additionalTariffs={[]}
      />
    );
    expect(screen.getByLabelText('Взрослые')).toHaveAttribute('max', '10');
  });
});
