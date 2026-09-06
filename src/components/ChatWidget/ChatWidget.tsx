'use client';

/**
 * Плавающий ИИ-помощник отеля.
 *
 * Возможности:
 * - История в localStorage
 * - Локальные ответы (номера, capabilities, отмена брони)
 * - POST /api/chat (LLM + OSM Overpass + fallback places)
 * - Prefill формы бронирования
 * - GSAP-анимации открытия/закрытия панели и появления сообщений
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import ChatIcon from '@/assets/icons/chat.svg';

import {
  loadChatMessages,
  saveChatMessages,
  clearChatMessages,
  isSafeHref,
  toInternalPath,
  tryLocalAnswer,
  isRoomsListQuestion,
  roomsOverviewText,
  type StoredChatMessage,
} from '@/lib/index.client';

import { useBookingForm } from '@/components/BookingForm/BookingFormProvider';
import type { BookingPrefill } from '@/components/BookingForm/BookingForm';
import { api } from '@/lib/utils/api';
import { toLocalYMD } from '@/lib/shared/date';
import { extractBookingPrefill } from '@/lib/shared/chat-utils';
import { phoneToTelHref } from '@/lib/utils/phone';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatQuickReplies from './ChatQuickReplies';
import ChatInput from './ChatInput';
import './ChatWidget.scss';

type Message = StoredChatMessage;

interface QuickReply {
  label: string;
  action: string;
}

interface ChatSettings {
  capabilities?: string;
  cancelBooking?: string;
}

type ChatWidgetProps = {
  welcomeMessage?: string;
  hotelPhone?: string;
};

export default function ChatWidget({ welcomeMessage = '', hotelPhone = '' }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [lastPrefill, setLastPrefill] = useState<BookingPrefill | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [chatSettings, setChatSettings] = useState<ChatSettings>({});

  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const openTlRef = useRef<gsap.core.Timeline | null>(null);
  const { openBooking } = useBookingForm();

  // --- localStorage ---
  useEffect(() => {
    setMessages(loadChatMessages());
    setHydrated(true);
  }, []);

  // Откладываем до первого открытия виджета — иначе фетч уходил на каждой
  // странице сайта, хотя ChatWidget смонтирован в layout всегда, а не только
  // когда пользователь реально открыл чат.
  const settingsFetchedRef = useRef(false);
  useEffect(() => {
    if (!isOpen || settingsFetchedRef.current) return;
    settingsFetchedRef.current = true;
    api
      .get<{ quickReplies?: QuickReply[]; capabilities?: string; cancelBooking?: string }>(
        '/api/chat/settings'
      )
      .then((data) => {
        setQuickReplies(data.quickReplies || []);
        setChatSettings({
          capabilities: data.capabilities || '',
          cancelBooking: data.cancelBooking || '',
        });
      })
      .catch((err) => console.error('Failed to load chat settings:', err));
  }, [isOpen]);

  useEffect(() => {
    if (!hydrated) return;
    saveChatMessages(messages);
  }, [messages, hydrated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, searchStatus, lastPrefill]);

  // Мобильная высота панели
  useEffect(() => {
    if (!isOpen) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const panel = panelRef.current;
      if (!panel) return;
      panel.style.maxHeight = `${Math.min(560, Math.max(280, vv.height - 24))}px`;
    };
    vv.addEventListener('resize', onResize);
    onResize();
    return () => vv.removeEventListener('resize', onResize);
  }, [isOpen]);

  // --- GSAP: открытие / закрытие ---
  const animateOpen = useCallback(() => {
    setIsOpen(true);
    requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      openTlRef.current?.kill();
      gsap.set(panel, {
        autoAlpha: 0,
        y: 24,
        scale: 0.94,
        transformOrigin: 'bottom right',
      });
      openTlRef.current = gsap.timeline({ defaults: { ease: 'power3.out' } });
      openTlRef.current.to(panel, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.38,
      });
    });
  }, []);

  const animateClose = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) {
      setIsOpen(false);
      return;
    }
    openTlRef.current?.kill();
    openTlRef.current = gsap.timeline({
      defaults: { ease: 'power2.in' },
      onComplete: () => setIsOpen(false),
    });
    openTlRef.current.to(panel, {
      autoAlpha: 0,
      y: 16,
      scale: 0.96,
      duration: 0.22,
    });
  }, []);

  // Пульс кнопки, когда чат закрыт
  useEffect(() => {
    if (isOpen || !toggleRef.current) return;
    const btn = toggleRef.current;
    const tw = gsap.to(btn, {
      scale: 1.06,
      duration: 1.4,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
    return () => {
      tw.kill();
      gsap.set(btn, { scale: 1 });
    };
  }, [isOpen]);

  // Появление нового сообщения
  const animateNewBubble = useCallback((id: string) => {
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-msg-id="${id}"]`);
      if (!el) return;
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 10, scale: 0.98 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: 'power2.out' }
      );
    });
  }, []);

  // Мерцание статуса «Думаю…» / «Ищу на карте…»
  useEffect(() => {
    if (!searchStatus && !isLoading) return;
    const el = document.querySelector('.chat-widget__status, .chat-widget__typing');
    if (!el) return;
    const tw = gsap.to(el, {
      opacity: 0.35,
      duration: 0.55,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
    return () => {
      tw.kill();
      gsap.set(el, { opacity: 1 });
    };
  }, [searchStatus, isLoading, messages.length]);

  const handleNavigation = useCallback(
    (url: string) => {
      if (!isSafeHref(url)) {
        console.warn('Blocked unsafe chat URL:', url);
        return;
      }
      const target = toInternalPath(url);
      if (!target) return;

      if (target.startsWith('tel:') || target.startsWith('mailto:')) {
        window.location.href = target;
        animateClose();
        return;
      }
      if (
        target.startsWith('https://yandex.ru/maps') ||
        target.startsWith('https://maps.yandex')
      ) {
        window.open(target, '_blank', 'noopener,noreferrer');
        return;
      }

      router.push(target);
      animateClose();
    },
    [router, animateClose]
  );

  const applyPrefill = useCallback(
    (prefill: BookingPrefill, openForm: boolean) => {
      setLastPrefill(prefill);
      if (openForm) {
        openBooking({
          ...prefill,
          comment: prefill.comment ?? 'Заявка из чата-помощника',
        });
        animateClose();
      }
    },
    [openBooking, animateClose]
  );

  const typeBotMessage = useCallback(
    (fullText: string, prefill: BookingPrefill | null) => {
      const botMessage: Message = {
        id: `${Date.now()}-bot`,
        role: 'bot',
        content: '',
      };
      setMessages((prev) => [...prev, botMessage]);
      animateNewBubble(botMessage.id);

      const chunkSize = 6;
      const delay = 28;
      let index = 0;
      let current = '';

      const tick = () => {
        if (index < fullText.length) {
          current += fullText.slice(index, index + chunkSize);
          index += chunkSize;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botMessage.id ? { ...m, content: current } : m
            )
          );
          window.setTimeout(tick, delay);
        } else if (prefill) {
          setLastPrefill(prefill);
          window.setTimeout(() => {
            openBooking({
              ...prefill,
              comment: prefill.comment ?? 'Заявка из чата-помощника',
            });
            animateClose();
          }, 500);
        }
      };
      tick();
    },
    [openBooking, animateClose, animateNewBubble]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userText = text.trim();
      const userMessage: Message = {
        id: `${Date.now()}-user`,
        role: 'user',
        content: userText,
      };

      setMessages((prev) => [...prev, userMessage]);
      animateNewBubble(userMessage.id);
      setInput('');
      setError('');
      setLastPrefill(null);

      if (isRoomsListQuestion(userText)) {
        try {
          const cats = await api.get<{ key: string; label: string }[]>(
            '/api/categories/public'
          );
          typeBotMessage(roomsOverviewText(cats), null);
        } catch {
          typeBotMessage(roomsOverviewText([]), null);
        }
        return;
      }

      const local = tryLocalAnswer(
        userText,
        chatSettings.capabilities,
        chatSettings.cancelBooking
      );
      if (local) {
        const { visible, prefill } = extractBookingPrefill(local);
        typeBotMessage(visible, prefill);
        return;
      }

      setIsLoading(true);

      //TODO: добавить из бд
      setSearchStatus(
        /где поесть|кафе|ресторан|рядом|поблизости|аптек|магазин/i.test(userText)
          ? 'Ищу на карте…'
          : 'Думаю…'
      );

      try {
        const history = [...messages, userMessage].slice(-20);
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history.map((m) => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content,
            })),
            today: toLocalYMD(new Date()),
          }),
        });

        if (!res.ok) {
          throw new Error('Не удалось связаться с помощником');
        }

        const answer = await res.text();  // получаем текст

        setSearchStatus(null);
        const { visible, prefill } = extractBookingPrefill(answer);
        typeBotMessage(visible, prefill);
      } catch (err) {
        setSearchStatus(null);
        setError(
          err instanceof Error ? err.message : 'Не удалось связаться с помощником'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, chatSettings, typeBotMessage, animateNewBubble]
  );

  const handleQuickReply = useCallback(
    (action: string) => {
      if (action === '__BOOK__') {
        openBooking();
        animateClose();
        return;
      }
      if (action === '__CALL__' && hotelPhone) {
        window.location.href = phoneToTelHref(hotelPhone);
        return;
      }
      if (action === '__CAPABILITIES__') {
        sendMessage('Что я могу?');
        return;
      }
      sendMessage(action);
    },
    [openBooking, sendMessage, animateClose, hotelPhone]
  );

  const handleClearMemory = useCallback(() => {
    clearChatMessages();
    setMessages([]);
    setLastPrefill(null);
  }, []);

  const handleLinkClick = useCallback(
    (href: string) => {
      if (href.startsWith('#')) {
        const targetElement = document.querySelector(href);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          animateClose();
        }
        return;
      }
      handleNavigation(href);
    },
    [handleNavigation, animateClose]
  );

  return (
    <div className="chat-widget">
      {!isOpen ? (
        <button
          ref={toggleRef}
          type="button"
          className="chat-widget__toggle"
          onClick={animateOpen}
          aria-label="Открыть чат"
        >
          <ChatIcon />
        </button>
      ) : (
        <div className="chat-widget__panel" ref={panelRef}>
          <ChatHeader
            canClear={messages.length > 0}
            onClear={handleClearMemory}
            onClose={animateClose}
          />
          <ChatMessages
            messages={messages}
            welcomeMessage={welcomeMessage}
            hydrated={hydrated}
            searchStatus={searchStatus}
            isLoading={isLoading}
            error={error}
            lastPrefill={lastPrefill}
            onLinkClick={handleLinkClick}
            onApplyPrefill={applyPrefill}
            messagesEndRef={messagesEndRef}
          />
          <ChatQuickReplies
            quickReplies={quickReplies}
            disabled={isLoading}
            onSelect={handleQuickReply}
          />
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => sendMessage(input)}
            disabled={isLoading}
          />
        </div>
      )}
    </div>
  );
}