'use client';

import { usePathname } from 'next/navigation';
import './Sidebar.scss';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  hotelName?: string;
}

const menuItems = [
  { href: '/admin/home', label: 'Главная', icon: '🏠' },
  { href: '/admin/categories', label: 'Категории', icon: '📂' },
  { href: '/admin/rooms', label: 'Номера', icon: '🛏️' },
  { href: '/admin/amenities', label: 'Удобства', icon: '🧰' },
  { href: '/admin/pricing', label: 'Тарифы', icon: '💳' },
  { href: '/admin/chat', label: 'Чат-бот', icon: '💬' },
  { href: '/admin/palette', label: 'Палитра', icon: '🎨' },
  { href: '/admin/seo', label: 'SEO', icon: '🔍' },
  { href: '/admin/settings', label: 'Настройки', icon: '⚙️' },
];

export default function Sidebar({ isOpen, onClose, hotelName = 'Название вашего отеля' }: SidebarProps) {
  const pathname = usePathname();

  const go = (href: string) => {
    onClose?.();
    if (pathname === href) return;
    window.location.assign(href);
  };

  return (
    <aside
      className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--closed'}`}
    >
      <div className="sidebar__top">
        <div className="sidebar__brand">
          <span className="sidebar__brand-title">{hotelName}</span>
          <span className="sidebar__brand-sub">Админ-панель</span>
        </div>
        <button
          type="button"
          className="sidebar__close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>

      <nav className="sidebar__nav">
        {menuItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <button
              key={item.href}
              type="button"
              className={`sidebar__link ${
                active ? 'sidebar__link--active' : ''
              }`}
              onClick={() => go(item.href)}
            >
              <span className="sidebar__icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}