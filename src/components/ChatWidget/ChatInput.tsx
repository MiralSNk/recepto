'use client';

import PrevBtn from '@/assets/icons/prev-btn.svg';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

/**
 * Поле ввода сообщения с кнопкой отправки.
 */
export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
}: ChatInputProps) {
  return (
    <form
      className="chat-widget__input-area"
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
    >
      <input
        className="chat-widget__input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Введите сообщение..."
        disabled={disabled}
        enterKeyHint="send"
      />
      <button className="chat-widget__send" type="submit" disabled={disabled} aria-label="Отправить">
        <PrevBtn />
      </button>
    </form>
  );
}