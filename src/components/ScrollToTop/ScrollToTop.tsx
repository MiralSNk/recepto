'use client';

import { useState, useEffect } from 'react';
import PrevBtn from '@/assets/icons/prev-btn.svg';
import './ScrollToTop.scss';

const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      className="scroll-to-top"
      onClick={scrollToTop}
      aria-label="Наверх"
    >
      <PrevBtn style={{ transform: 'rotate(90deg)' }} />
    </button>
  );
};

export default ScrollToTop;