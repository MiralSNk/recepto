import 'server-only';

/**
 * In-memory rate-limit по ключу (обычно IP или email+IP). Живёт в памяти
 * одного Node-процесса — сбрасывается при рестарте и не разделяется между
 * инстансами при горизонтальном масштабировании. Годится, пока приложение
 * работает как один PM2-процесс; при масштабировании на несколько инстансов
 * нужен внешний стор (Redis/Upstash).
 */
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return function checkRateLimit(key: string): boolean {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= maxRequests) return false;
    entry.count++;
    return true;
  };
}
