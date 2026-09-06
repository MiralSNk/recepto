'use client';

import { useState } from 'react';

export interface UnansweredQuery {
  id: number;
  query_text: string;
  answer: string | null;
  answered_at: string | null;
  count: number;
  last_asked_at: string;
  created_at: string;
}

interface Props {
  queries: UnansweredQuery[];
  onDelete: (id: number) => void;
  onSaveAnswer: (id: number, answer: string | null) => Promise<void>;
}

export default function UnansweredQueriesSection({
  queries,
  onDelete,
  onSaveAnswer,
}: Props) {
  return (
    <section className="admin-chat__section">
      <h2>Неотвеченные запросы</h2>
      <p className="admin-chat__hint">
        Сохранённый ответ бот будет отдавать при похожем вопросе.
      </p>
      {queries.length === 0 ? (
        <p>Пока нет запросов.</p>
      ) : (
        <ul className="admin-chat__list">
          {queries.map((query) => (
            <UnansweredItem
              key={query.id}
              query={query}
              onDelete={onDelete}
              onSaveAnswer={onSaveAnswer}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function UnansweredItem({
  query,
  onDelete,
  onSaveAnswer,
}: {
  query: UnansweredQuery;
  onDelete: (id: number) => void;
  onSaveAnswer: (id: number, answer: string | null) => Promise<void>;
}) {
  const [text, setText] = useState(query.answer || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSaveAnswer(query.id, text.trim() || null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="admin-chat__list-item admin-chat__list-item--block">
      <div className="admin-chat__list-info">
        <strong>{query.query_text}</strong>
        <span>Повторений: {query.count}</span>
        {query.answer && (
          <span className="admin-chat__answered-badge">Есть ответ</span>
        )}
      </div>
      <div className="admin-chat__answer-form">
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ответ бота на этот вопрос…"
        />
      </div>
      <div className="admin-chat__answer-actions">
        <button type="button" className="admin-chat__edit-btn" disabled={saving} onClick={save}>
          {saving ? '…' : 'Сохранить ответ'}
        </button>
        {query.answer && (
          <button
            type="button"
            className="admin-chat__edit-btn"
            disabled={saving}
            onClick={async () => {
              setText('');
              setSaving(true);
              try {
                await onSaveAnswer(query.id, null);
              } finally {
                setSaving(false);
              }
            }}
          >
            Сбросить
          </button>
        )}
        <button
          type="button"
          className="admin-chat__delete-btn"
          onClick={() => onDelete(query.id)}
        >
          Удалить
        </button>
      </div>
    </li>
  );
}
