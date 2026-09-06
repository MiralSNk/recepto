export type StoredChatMessage = {
  id: string;
  role: 'user' | 'bot';
  content: string;
};

const KEY = 'recepto_chat_v1';
const MAX = 40; // -> не раздувать localStorage и промпт

export function loadChatMessages(): StoredChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredChatMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'bot') &&
          typeof m.content === 'string' &&
          typeof m.id === 'string'
      )
      .slice(-MAX);
  } catch {
    return [];
  }
}

export function saveChatMessages(messages: StoredChatMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(messages.slice(-MAX)));
  } catch {
    // quota / private mode — молча игнорируем
  }
}

export function clearChatMessages() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // -> продолжаем игнор
  }
}