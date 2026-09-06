/**
 * Репозиторий для работы с пользователями (администраторами).
 */
export interface IUserRepository {
  /**
   * Найти пользователя по email.
   */
  findByEmail(email: string): Promise<{
    id: number;
    email: string;
    password_hash: string;
    role: string;
  } | null>;

  /**
   * Создать нового пользователя.
   */
  createUser(data: {
    email: string;
    password_hash: string;
    role?: string;
  }): Promise<{ id: number }>;

  /**
   * Обновить пароль пользователя по id.
   */
  updatePassword(id: number, password_hash: string): Promise<void>;

  /**
   * Первый (по id) администратор — используется только для восстановления
   * пароля через секретное слово (единственный поток без email на входе).
   * Осознанное допущение: в системе один админ. Таблица users физически
   * это не ограничивает, но ни один другой код в проекте не работает с
   * несколькими пользователями.
   */
  findFirstAdmin(): Promise<{
    id: number;
    email: string;
    password_hash: string;
    secret_word_hash: string | null;
    role: string;
  } | null>;

  /**
   * Задать/сменить секретное слово (хеш) для восстановления пароля.
   * null — снять (восстановление станет недоступно).
   */
  updateSecretWord(id: number, secret_word_hash: string | null): Promise<void>;
}