'use client';

import PrevBtn from '@/assets/icons/prev-btn.svg';

interface ChatHeaderProps {
  canClear: boolean;
  onClear: () => void;
  onClose: () => void;
}

/**
 * Шапка чат-виджета: заголовок, кнопки очистки и закрытия.
 */
export default function ChatHeader({
  canClear,
  onClear,
  onClose,
}: ChatHeaderProps) {
  return (
    <div className="chat-widget__header">
      <div className="chat-widget__header-title">
        <span className="chat-widget__header-dot" aria-hidden />
        <span>Помощник отеля</span>
      </div>
      <div className="chat-widget__header-actions">
        {canClear && (
          <button
            type="button"
            className="chat-widget__clear"
            onClick={onClear}
            title="Очистить переписку"
          >
            Очистить
          </button>
        )}
        <button
          type="button"
          className="chat-widget__close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <PrevBtn style={{ transform: 'rotate(180deg)' }} />
        </button>
      </div>
    </div>
  );
}