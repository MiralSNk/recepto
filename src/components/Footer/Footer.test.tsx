import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import Footer from './Footer';

describe('Footer', () => {
  it('ссылка на политику конфиденциальности находится в колонке «Информация»', () => {
    render(<Footer />);
    const infoHeading = screen.getByRole('heading', { name: 'Информация' });
    const infoColumn = infoHeading.closest('.footer__column');
    expect(infoColumn).not.toBeNull();
    const privacyLink = within(infoColumn as HTMLElement).getByRole('link', {
      name: 'Политика конфиденциальности',
    });
    expect(privacyLink).toHaveAttribute('href', '/privacy');
  });

  it('колонка «Информация» также содержит «О нас» и «Номера»', () => {
    render(<Footer />);
    const infoHeading = screen.getByRole('heading', { name: 'Информация' });
    const infoColumn = infoHeading.closest('.footer__column') as HTMLElement;
    expect(within(infoColumn).getByRole('link', { name: 'О нас' })).toHaveAttribute('href', '/contacts');
    expect(within(infoColumn).getByRole('link', { name: 'Номера' })).toHaveAttribute('href', '/');
  });

  it('колонка «Контакты» больше не содержит ссылку на политику', () => {
    render(<Footer hotelAddress="Адрес" hotelPhone="+79990000000" hotelEmail="a@b.ru" />);
    const contactsHeading = screen.getByRole('heading', { name: 'Контакты' });
    const contactsColumn = contactsHeading.closest('.footer__column') as HTMLElement;
    expect(
      within(contactsColumn).queryByRole('link', { name: 'Политика конфиденциальности' })
    ).not.toBeInTheDocument();
  });
});
