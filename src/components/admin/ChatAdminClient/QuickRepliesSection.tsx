'use client';

/**
 * Секция управления быстрыми кнопками чата.
 * Позволяет добавлять и удалять кнопки.
 */
interface QuickReply {
  id: number;
  label: string;
  action: string;
  sort_order: number;
}

interface QuickRepliesSectionProps {
  quickReplies: QuickReply[];
  onAdd: () => void;
  onDelete: (id: number) => void;
}

export default function QuickRepliesSection({
  quickReplies,
  onAdd,
  onDelete,
}: QuickRepliesSectionProps) {
  return (
    <section className="admin-chat__section">
      <div className="admin-chat__section-header">
        <h2>Быстрые кнопки</h2>
        <button className="admin-chat__add-btn" onClick={onAdd}>
          + Добавить кнопку
        </button>
      </div>
      <ul className="admin-chat__list">
        {quickReplies.map((qr) => (
          <li key={qr.id} className="admin-chat__list-item">
            <div className="admin-chat__list-info">
              <strong>{qr.label}</strong>
              <span>{qr.action}</span>
            </div>
            <button
              className="admin-chat__delete-btn"
              onClick={() => onDelete(qr.id)}
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}