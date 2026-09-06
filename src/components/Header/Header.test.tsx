import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from './Header';

const pushMock = vi.fn();
let currentPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({ push: pushMock }),
}));

describe('Header', () => {
  beforeEach(() => {
    pushMock.mockClear();
    currentPathname = '/';
    document.body.innerHTML = '';
  });

  it('содержит пункт «Номера», ведущий на главную', () => {
    render(<Header />);
    const links = screen.getAllByRole('link', { name: 'Номера' });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute('href', '/'));
  });

  it('сохраняет пункты «Об отеле» и «Контакты»', () => {
    render(<Header />);
    expect(screen.getAllByRole('link', { name: 'Об отеле' })[0]).toHaveAttribute('href', '/contacts');
    expect(screen.getAllByRole('link', { name: 'Контакты' })[0]).toHaveAttribute('href', '#contacts');
  });

  it('на главной странице клик по «Номера» скроллит к панели бронирования, а не перезагружает страницу', () => {
    const panel = document.createElement('div');
    panel.id = 'booking-panel-card';
    document.body.appendChild(panel);
    const scrollIntoView = vi.fn();
    panel.scrollIntoView = scrollIntoView;

    render(<Header />);
    fireEvent.click(screen.getAllByRole('link', { name: 'Номера' })[0]);

    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth', block: 'start' })
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('на другой странице клик по «Номера» переходит на главную', () => {
    currentPathname = '/contacts';
    render(<Header />);
    fireEvent.click(screen.getAllByRole('link', { name: 'Номера' })[0]);
    expect(pushMock).toHaveBeenCalledWith('/');
  });
});
