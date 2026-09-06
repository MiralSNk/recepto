'use client';

import { signOut } from 'next-auth/react';
import './Header.scss';

interface HeaderProps {
  toggleSidebar: () => void;
}

export default function Header({ toggleSidebar }: HeaderProps) {
  return (
    <header className="admin-header">
      <button className="admin-header__toggle" onClick={toggleSidebar}>
        ☰
      </button>
      <div className="admin-header__right">
        <button className="admin-header__logout" onClick={() => signOut({ callbackUrl: '/admin/login' })}>
          Выйти
        </button>
      </div>
    </header>
  );
}