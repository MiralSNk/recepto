'use client';

/**
 * Список сообщений чата + welcome, статус поиска, ошибка, prefill-бар.
 * data-msg-id используется GSAP для появления пузырей.
 */

import { type RefObject } from 'react';
import DOMPurify from 'dompurify';
import { formatMessage } from '@/lib/shared/chat-utils';
import type { BookingPrefill } from '@/components/BookingForm/BookingForm';
import type { StoredChatMessage } from '@/lib/index.client';

interface ChatMessagesProps {
  messages: StoredChatMessage[];
  welcomeMessage?: string;
  hydrated: boolean;
  searchStatus: string | null;
  isLoading: boolean;
  error: string;
  lastPrefill: BookingPrefill | null;
  onLinkClick: (href: string) => void;
  onApplyPrefill: (prefill: BookingPrefill, openForm: boolean) => void;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

const DEFAULT_WELCOME = 'Здравствуйте! Я помощник отеля.\nСпросите про номера, бронирование, как добраться или что рядом.';

export default function ChatMessages({
  messages,
  welcomeMessage = '',
  hydrated,
  searchStatus,
  isLoading,
  error,
  lastPrefill,
  onLinkClick,
  onApplyPrefill,
  messagesEndRef,
}: ChatMessagesProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const a = target.closest('a');
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute('href');
    if (href) onLinkClick(href);
  };

  const welcomeLines = (welcomeMessage || DEFAULT_WELCOME).split('\n').filter(Boolean);

  return (
    <div className="chat-widget__messages">
      {hydrated && messages.length === 0 && (
        <div className="chat-widget__welcome">
          <p>{welcomeLines[0]}</p>
          {welcomeLines.length > 1 && (
            <p className="chat-widget__welcome-hint">{welcomeLines.slice(1).join(' ')}</p>
          )}
        </div>
      )}

      {messages.map((m) => (
        <div
          key={m.id}
          data-msg-id={m.id}
          className={`chat-widget__message chat-widget__message--${m.role}`}
          onClick={m.role === 'bot' ? handleClick : undefined}
          dangerouslySetInnerHTML={
            m.role === 'bot'
              ? { __html: DOMPurify.sanitize(formatMessage(m.content)) }
              : undefined
          }
        >
          {m.role === 'user' ? m.content : null}
        </div>
      ))}

      {lastPrefill && (
        <div className="chat-widget__prefill-bar">
          <button
            type="button"
            className="chat-widget__prefill-btn"
            onClick={() => onApplyPrefill(lastPrefill, true)}
          >
            Открыть форму брони
          </button>
        </div>
      )}

      {error && (
        <div className="chat-widget__message chat-widget__message--error">
          ⚠️ {error}
        </div>
      )}

      {searchStatus && (
        <div className="chat-widget__message chat-widget__status">
          {searchStatus}
        </div>
      )}

      {isLoading && !searchStatus && (
        <div className="chat-widget__message chat-widget__message--bot chat-widget__typing">
          …
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}