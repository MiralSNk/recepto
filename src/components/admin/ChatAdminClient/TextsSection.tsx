'use client';

/**
 * Секция редактирования текстовых настроек чат-бота.
 * Принимает текущие значения и колбэк для сохранения.
 */
interface TextsSectionProps {
  capabilities: string;
  cancelBooking: string;
  onChangeCapabilities: (value: string) => void;
  onChangeCancelBooking: (value: string) => void;
  onSave: () => void;
  saving: boolean;
}

export default function TextsSection({
  capabilities,
  cancelBooking,
  onChangeCapabilities,
  onChangeCancelBooking,
  onSave,
  saving,
}: TextsSectionProps) {
  return (
    <section className="admin-chat__section">
      <h2>Тексты ответов</h2>
      <p className="admin-chat__hint">
        Ссылки — в формате <code>[текст](адрес)</code>: квадратные скобки — то, что видит
        гость, круглые — куда ведёт ссылка. В адрес можно вписать: путь на самом сайте
        (<code>/contacts</code>), якорь на этой же странице (<code>#contacts</code>), номер
        телефона (<code>tel:+70000000000</code>) или email (<code>mailto:info@example.com</code>).
        Например:
        <br />
        <code>Телефон: [Позвонить](tel:+70000000000)</code>
        <br />
        <code>Контакты: [Контакты](#contacts)</code>
        <br />
        <code>Об отеле: [Подробная информация](/contacts)</code>
        <br />
        Строка, начинающаяся с <code>-</code> или <code>*</code>, станет пунктом списка;
        перенос строки — обычный перенос в сообщении чата.
      </p>
      <div className="admin-chat__fields">
        <label className="admin-chat__field">
          <span>Возможности (capabilities)</span>
          <textarea
            value={capabilities}
            onChange={(e) => onChangeCapabilities(e.target.value)}
            rows={6}
          />
        </label>
        <label className="admin-chat__field">
          <span>Отмена бронирования (cancel)</span>
          <textarea
            value={cancelBooking}
            onChange={(e) => onChangeCancelBooking(e.target.value)}
            rows={6}
          />
        </label>
        <button
          className="admin-chat__save-btn"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? 'Сохранение...' : 'Сохранить тексты'}
        </button>
      </div>
    </section>
  );
}