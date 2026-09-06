import type { BookingPrefill } from '@/components/BookingForm/BookingForm';

/**
 * Преобразует текст сообщения в HTML: ссылки, списки, переносы строк.
 * Использует DOMPurify на стороне вызова.
 */
export function formatMessage(text: string): string {
  let html = text;

  // Markdown-ссылки [текст](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="chat-widget__link">$1</a>'
  );

  // Диапазоны уже вставленных <a>...</a> — автоссылки на шаге ниже не должны
  // трогать текст ВНУТРИ них. Иначе путь внутри видимого текста markdown-
  // ссылки ("[Смотри /rooms/5 сейчас](/booking)") оборачивается в свой
  // вложенный <a>, а вложенные <a> — невалидный HTML: браузер/DOMPurify
  // закрывают внешний тег раньше времени, и часть текста ("сейчас")
  // оказывается уже вне какой-либо ссылки вместо ведущей на /booking.
  const linkRanges: Array<[number, number]> = [];
  {
    const linkRe = /<a\s[^>]*>[^<]*<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(html))) {
      linkRanges.push([m.index, m.index + m[0].length]);
    }
  }

  // Автоматические ссылки на внутренние пути
  html = html.replace(
    /(^|[^"'>=:/])(\/(?:[a-z0-9_-]+)(?:\/\d+)?|\/contacts|\/privacy)(?=[\s.,);!?]|$)/gim,
    (match: string, prefix: string, path: string, offset: number) => {
      const insideLink = linkRanges.some(([start, end]) => offset >= start && offset < end);
      if (insideLink) return match;
      return `${prefix}<a href="${path}" class="chat-widget__link">${path}</a>`;
    }
  );

  // Переносы строк
  html = html.replace(/\n/g, '<br/>');

  // Обработка маркированных списков
  const lines = html.split('<br/>');
  let inList = false;
  let result = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^[\*\-]\s/.test(line)) {
      if (!inList) {
        result += '<ul>';
        inList = true;
      }
      result += `<li>${line.replace(/^[\*\-]\s/, '')}</li>`;
    } else {
      if (inList) {
        result += '</ul>';
        inList = false;
      }
      result += line;
    }
    if (i < lines.length - 1) result += '<br/>';
  }
  if (inList) result += '</ul>';

  return result;
}

/**
 * Извлекает скрытый блок `<!--BOOKING ... BOOKING-->` с данными для формы брони.
 * Возвращает видимый текст и prefill-данные (если есть).
 */
export function extractBookingPrefill(text: string): {
  visible: string;
  prefill: BookingPrefill | null;
} {
  const re = /<!--BOOKING\s*([\s\S]*?)\s*BOOKING-->/i;
  const match = text.match(re);
  if (!match) return { visible: text, prefill: null };

  const visible = text.replace(re, '').trim();
  try {
    const raw = JSON.parse(match[1].trim()) as Record<string, unknown>;
    const prefill: BookingPrefill = {};

    if (typeof raw.roomId === 'number') prefill.roomId = raw.roomId;
    else if (typeof raw.roomId === 'string' && raw.roomId.trim()) {
      const n = Number(raw.roomId);
      if (!Number.isNaN(n)) prefill.roomId = n;
    }
    if (typeof raw.roomName === 'string') prefill.roomName = raw.roomName;
    if (typeof raw.checkIn === 'string') prefill.checkIn = raw.checkIn;
    if (typeof raw.checkOut === 'string') prefill.checkOut = raw.checkOut;
    if (typeof raw.adults === 'string' || typeof raw.adults === 'number') {
      prefill.adults = String(raw.adults);
    }
    if (typeof raw.children === 'string' || typeof raw.children === 'number') {
      prefill.children = String(raw.children);
    }
    if (typeof raw.name === 'string') prefill.name = raw.name;
    if (typeof raw.phone === 'string') prefill.phone = raw.phone;
    if (typeof raw.email === 'string') prefill.email = raw.email;
    if (typeof raw.comment === 'string') prefill.comment = raw.comment;
    if (typeof raw.priceDay === 'number') prefill.priceDay = raw.priceDay;
    if (typeof raw.priceHalfDay === 'number') {
      prefill.priceHalfDay = raw.priceHalfDay;
    }

    const hasSomething = Object.values(prefill).some(
      (v) => v !== undefined && v !== ''
    );

    return { visible, prefill: hasSomething ? prefill : null };
  } catch {
    return { visible, prefill: null };
  }
}