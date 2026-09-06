/**
 * Неотвеченный запрос ИИ-ассистента.
 * Соответствует строке таблицы chat_unanswered_queries.
 * Поле answer — готовый ответ из админки (если задан).
 */
export interface UnansweredQuery {
  id: number;
  query_text: string;
  answer: string | null;
  answered_at: string | null;
  count: number;
  last_asked_at: string;
  created_at: string;
}