import type { UnansweredQuery } from '@/types';

/**
 * Репозиторий для работы с неотвеченными запросами ИИ-ассистента.
 */
export interface IUnansweredQueryRepository {
  /**
   * Получить все неотвеченные запросы (сортировка по убыванию count).
   */
  getUnansweredQueries(): Promise<UnansweredQuery[]>;

  /**
   * Найти готовый ответ администратора (точное совпадение query_text, без учёта регистра).
   */
  findAnswer(queryText: string): Promise<string | null>;

  /**
   * Добавить или увеличить счётчик неотвеченного запроса.
   * Если запрос уже существует, count увеличивается на 1.
   */
  upsertUnansweredQuery(queryText: string): Promise<void>;

  /** Сохранить / обновить ответ администратора */
  setAnswer(id: number, answer: string): Promise<void>;

  /** Сбросить ответ (вернуть в «неотвеченные») */
  clearAnswer(id: number): Promise<void>;

  /**
   * Удалить неотвеченный запрос по id (например, после добавления ответа).
   */
  deleteUnansweredQuery(id: number): Promise<void>;
}