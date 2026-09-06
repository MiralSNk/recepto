'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import './AdminLayout.scss';

interface AdminLayoutProps {
  children: React.ReactNode;
  hotelName?: string;
}

export default function AdminLayout({ children, hotelName }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setSidebarOpen(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (sidebarOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const close = () => setSidebarOpen(false);
  const toggle = () => setSidebarOpen((v) => !v);

  return (
    <div className="admin-layout">
      {sidebarOpen && (
        <button
          type="button"
          className="admin-layout__backdrop"
          aria-label="Закрыть меню"
          onClick={close}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={close} hotelName={hotelName} />

      <div
        className={`admin-layout__main ${
          sidebarOpen ? 'admin-layout__main--with-sidebar' : ''
        }`}
      >
        <Header toggleSidebar={toggle} />
        <main className="admin-layout__content">{children}</main>
      </div>
    </div>
  );
}