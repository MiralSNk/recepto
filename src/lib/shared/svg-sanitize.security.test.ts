import { describe, it, expect } from 'vitest';
import { sanitizeSvg } from './svg-sanitize';

/**
 * Регрессионные тесты на ранее найденные и с тех пор закрытые обходы
 * regex-based sanitizeSvg (проверено вручную, включая разбор через
 * jsdom/parse5 там, где важно реальное поведение HTML-парсера, а не только
 * текст регулярки) — то, что штатный svg-sanitize.test.ts не покрывает.
 * Каждый тест ДОЛЖЕН ПРОХОДИТЬ на текущей реализации (UNCLOSED_SCRIPT_RE,
 * "[\s/]+" в EVENT_HANDLER_ATTR_RE, decodeNumericEntities() в
 * isDangerousHrefValue() — см. svg-sanitize.ts); падение теста означает
 * регресс защиты, а не ожидаемое поведение.
 */
describe('sanitizeSvg — обход санитайзера (закрытые уязвимости, регресс-тесты)', () => {
  it('script без закрывающего тега тоже вырезается (UNCLOSED_SCRIPT_RE)', () => {
    // SCRIPT_RE = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi требует буквальную
    // подстроку "</script" где-то дальше в строке. Если атрибут/файл
    // обрывается без закрывающего тега (например, отрезан на середине или
    // просто не закрыт), совпадения нет вообще — весь <script> остаётся.
    // Реальный браузер при этом дочитывает содержимое script до конца файла
    // и вставляет полноценный <script>-элемент в DOM.
    const svg = '<svg><script>alert(document.cookie)</svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toMatch(/<script/i);
  });

  it('script с внешним src и без закрывающего тега тоже вырезается', () => {
    const svg = '<svg><script src="https://evil.example/x.js"></svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toMatch(/<script/i);
  });

  it('обработчик события, отделённый "/" вместо пробела, тоже вырезается', () => {
    // EVENT_HANDLER_ATTR_RE требует \s+ непосредственно перед "on...". Но по
    // алгоритму токенизации HTML "/" сразу после имени тега переводит
    // парсер в "self-closing start tag state", и следующий символ (кроме
    // ">") реконсьюмится как начало НОВОГО имени атрибута — то есть
        // "<svg/onload=...>" браузер разбирает как <svg onload="...">.
    // Подтверждено эмпирически через jsdom (parse5): innerHTML с этой
    // строкой даёт элементу реальный атрибут onload со значением "alert(1)".
    const svg = '<svg/onload=alert(1)><path fill="#000" d="a"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toMatch(/onload/i);
  });

  it('обработчик события после "/" сразу за значением предыдущего атрибута тоже вырезается', () => {
    // Тот же трюк, но "/" стоит не после имени тега, а после закрытой
    // кавычки предыдущего атрибута (after-attribute-value-quoted-state тоже
    // переходит в self-closing-start-tag-state по "/"). jsdom подтверждает:
    // <path fill="red"/onclick=alert(1)> → реальный атрибут onclick.
    const svg = '<path fill="red"/onclick=alert(1)>text</path>';
    const result = sanitizeSvg(svg);
    expect(result).not.toMatch(/onclick/i);
  });

  it('javascript: в href, закодированный десятичной числовой ссылкой на символ, тоже вырезается', () => {
    // Браузер раскодирует числовые ссылки на символы (&#106; → "j") на этапе
    // токенизации значения атрибута — то есть ЗАДОЛГО до того, как что-либо
    // интерпретирует строку как URI-схему (подтверждено через jsdom:
    // getAttribute('href') после парсинга возвращает уже раскодированную
    // "javascript:alert(1)"). decodeNumericEntities() в isDangerousHrefValue()
    // раскодирует значение перед проверкой на javascript: — см. svg-sanitize.ts.
    const svg = '<svg><a href="&#106;avascript:alert(1)"><path d="a"/></a></svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toContain('avascript:alert(1)');
  });

  it('javascript: в xlink:href, закодированный шестнадцатеричной числовой ссылкой, тоже вырезается', () => {
    const svg = '<svg><a xlink:href="&#x6A;avascript:alert(1)"><path d="a"/></a></svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toContain('avascript:alert(1)');
  });
});
