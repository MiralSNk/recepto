'use client';

interface QuickReply {
  label: string;
  action: string;
}

interface ChatQuickRepliesProps {
  quickReplies: QuickReply[];
  disabled?: boolean;
  onSelect: (action: string) => void;
}

/**
 * Быстрые кнопки-подсказки.
 */
export default function ChatQuickReplies({
  quickReplies,
  disabled,
  onSelect,
}: ChatQuickRepliesProps) {
  if (quickReplies.length === 0) return null;

  return (
    <div className="chat-widget__quick-replies">
      {quickReplies.map((reply) => (
        <button
          key={reply.label}
          type="button"
          onClick={() => onSelect(reply.action)}
          disabled={disabled}
        >
          {reply.label}
        </button>
      ))}
    </div>
  );
}