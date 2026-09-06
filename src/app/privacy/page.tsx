import type { Metadata } from 'next';
import Link from 'next/link';
import '@/styles/privacy/privacy.scss';
import { getSiteSettings } from '@/lib/index.server';
import { phoneToTelHref } from '@/lib/utils/phone';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: settings.seo_privacy_title || 'Политика конфиденциальности',
    description: settings.seo_privacy_description || '',
    alternates: { canonical: '/privacy' },
    openGraph: {
      title: settings.og_privacy_title || settings.seo_privacy_title || 'Политика конфиденциальности — Название вашего отеля',
      description: settings.og_privacy_description || settings.seo_privacy_description || '',
      url: '/privacy',
      type: 'website',
      images: settings.og_privacy_image ? [{ url: settings.og_privacy_image }] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

const UPDATED_AT = '15 августа 2026 г.';

export default async function PrivacyPage() {
  const settings = await getSiteSettings();
  const hotelName = settings.hotel_name || 'Название вашего отеля';
  const hotelAddress = settings.hotel_address || 'Адрес вашего отеля';
  const hotelPhone = settings.hotel_phone || '+7 (000) 000-00-00';
  const hotelEmail = settings.hotel_email || 'info@example.com';

  return (
    <article className="privacy">
      <div className="privacy__container">
        <header className="privacy__header">
          <p className="privacy__eyebrow">Юридическая информация</p>
          <h1 className="privacy__title">Политика конфиденциальности</h1>
          <p className="privacy__updated">Дата обновления: {UPDATED_AT}</p>
        </header>

        <div className="privacy__lead">
          <p>
            Настоящая Политика определяет порядок обработки и защиты персональных
            данных пользователей сайта{' '}
            <a href={SITE_URL} rel="noopener noreferrer">
              {SITE_URL.replace(/^https?:\/\//, '')}
            </a>{' '}
            (далее — «Сайт»), принадлежащего гостинице {hotelName} (далее — «Оператор»).
          </p>
          <p>
            Используя Сайт и отправляя формы (бронирование, обратная связь), вы
            подтверждаете, что ознакомились с этой Политикой и согласны с условиями
            обработки персональных данных.
          </p>
        </div>

        <nav className="privacy__toc" aria-label="Содержание">
          <p className="privacy__toc-title">Содержание</p>
          <ol>
            <li><a href="#operator">Оператор данных</a></li>
            <li><a href="#terms">Основные понятия</a></li>
            <li><a href="#data">Какие данные мы собираем</a></li>
            <li><a href="#purposes">Цели обработки</a></li>
            <li><a href="#legal">Правовые основания</a></li>
            <li><a href="#storage">Срок хранения</a></li>
            <li><a href="#transfer">Передача третьим лицам</a></li>
            <li><a href="#cookies">Файлы cookie и аналитика</a></li>
            <li><a href="#security">Защита данных</a></li>
            <li><a href="#rights">Права пользователя</a></li>
            <li><a href="#children">Данные несовершеннолетних</a></li>
            <li><a href="#changes">Изменение Политики</a></li>
            <li><a href="#privacy-contacts">Контакты по вопросам ПДн</a></li>
          </ol>
        </nav>

        <div className="privacy__body">
          <section id="operator" className="privacy__section">
            <h2>1. Оператор персональных данных</h2>
            <p>Оператором персональных данных является {hotelName}.</p>
            <ul>
              <li>
                <strong>Адрес:</strong> {hotelAddress}
              </li>
              <li>
                <strong>Телефон:</strong>{' '}
                <a href={phoneToTelHref(hotelPhone)}>{hotelPhone}</a>
              </li>
              <li>
                <strong>Email:</strong>{' '}
                <a href={`mailto:${hotelEmail}`}>{hotelEmail}</a>
              </li>
              <li>
                <strong>Сайт:</strong>{' '}
                <a href={SITE_URL}>{SITE_URL.replace(/^https?:\/\//, '')}</a>
              </li>
            </ul>
            <p className="privacy__note">
              Сайт носит информационный и рекламный характер и не является
              единственным официальным каналом бронирования. Заявки, отправленные
              через формы Сайта, обрабатываются Оператором для связи с гостем.
            </p>
          </section>

          <section id="terms" className="privacy__section">
            <h2>2. Основные понятия</h2>
            <ul>
              <li>
                <strong>Персональные данные (ПДн)</strong> — любая информация,
                относящаяся к прямо или косвенно определённому физическому лицу
                (субъекту персональных данных).
              </li>
              <li>
                <strong>Обработка ПДн</strong> — любые действия с данными: сбор,
                запись, хранение, использование, передача, обезличивание, удаление.
              </li>
              <li>
                <strong>Пользователь</strong> — посетитель Сайта, в том числе
                отправивший заявку через формы.
              </li>
            </ul>
          </section>

          <section id="data" className="privacy__section">
            <h2>3. Какие данные мы собираем</h2>
            <p>В зависимости от действий на Сайте могут обрабатываться:</p>
            <h3>3.1. Данные, которые вы указываете сами</h3>
            <ul>
              <li>имя;</li>
              <li>номер телефона;</li>
              <li>адрес электронной почты;</li>
              <li>даты заезда и выезда, количество гостей;</li>
              <li>название или идентификатор номера (при бронировании);</li>
              <li>текст сообщения / комментария к заявке.</li>
            </ul>
            <h3>3.2. Технические данные</h3>
            <ul>
              <li>IP-адрес (в том числе для защиты от спама и проверки капчи);</li>
              <li>тип браузера, устройство, приблизительные данные о сессии;</li>
              <li>
                результат прохождения проверки «я не робот» (Yandex SmartCaptcha) —
                без доступа Оператора к содержимому вашей переписки с сервисом капчи.
              </li>
            </ul>
            <p>
              Мы <strong>не запрашиваем</strong> паспортные данные, реквизиты
              банковских карт и иные чувствительные сведения через формы Сайта.
              Оплата и оформление проживания при необходимости согласуются напрямую
              с отелем.
            </p>
          </section>

          <section id="purposes" className="privacy__section">
            <h2>4. Цели обработки</h2>
            <ul>
              <li>обработка заявок на бронирование и обратную связь;</li>
              <li>связь с вами по телефону, email или иным указанным способом;</li>
              <li>уточнение деталей проживания и подтверждение заявки;</li>
              <li>защита Сайта от автоматизированного спама и злоупотреблений;</li>
              <li>
                улучшение работы Сайта (при использовании обезличенной статистики);
              </li>
              <li>исполнение требований законодательства РФ.</li>
            </ul>
            <p>
              Мы не используем ваши данные для массовой рекламной рассылки без
              отдельного согласия.
            </p>
          </section>

          <section id="legal" className="privacy__section">
            <h2>5. Правовые основания</h2>
            <p>Обработка осуществляется на основании:</p>
            <ul>
              <li>
                Федерального закона от 27.07.2006 № 152‑ФЗ «О персональных данных»;
              </li>
              <li>
                вашего согласия, выраженного при отправке формы (в том числе
                посредством отметки о согласии, если она предусмотрена на Сайте);
              </li>
              <li>
                необходимости обработки для исполнения запроса пользователя до
                заключения договора (ст. 6 152‑ФЗ).
              </li>
            </ul>
          </section>

          <section id="storage" className="privacy__section">
            <h2>6. Срок хранения</h2>
            <ul>
              <li>
                заявки на бронирование и обращения — в течение срока, необходимого
                для обработки запроса и последующей связи, как правило не более{' '}
                <strong>12 месяцев</strong> с даты последнего взаимодействия, если
                иное не требуется для защиты прав Оператора или по закону;
              </li>
              <li>
                технические логи и данные капчи — в объёме и сроки, достаточные для
                обеспечения безопасности (как правило, кратковременно).
              </li>
            </ul>
            <p>
              По достижении целей обработки или по вашему запросу данные удаляются
              или обезличиваются, если сохранение не требуется законом.
            </p>
          </section>

          <section id="transfer" className="privacy__section">
            <h2>7. Передача третьим лицам</h2>
            <p>
              Мы не продаём персональные данные. Передача возможна только в
              следующих случаях:
            </p>
            <ul>
              <li>
                <strong>Сервисы, необходимые для работы Сайта:</strong> хостинг,
                почтовый сервис (SMTP) для доставки писем с заявок, Yandex
                SmartCaptcha — в объёме, нужном для оказания услуги;
              </li>
              <li>
                <strong>По требованию закона</strong> — уполномоченным органам в
                установленном порядке;
              </li>
              <li>
                <strong>С вашего согласия</strong> — в иных случаях.
              </li>
            </ul>
            <p>
              При передаче мы стремимся ограничивать объём данных минимумом,
              необходимым для цели обработки.
            </p>
          </section>

          <section id="cookies" className="privacy__section">
            <h2>8. Файлы cookie и аналитика</h2>
            <p>
              Сайт может использовать технические cookie, необходимые для корректной
              работы (например, сохранение параметров интерфейса, защита форм).
            </p>
            <p>
              Автозаполнение полей имени, телефона и email выполняется{' '}
              <strong>браузером пользователя</strong> на основе его собственных
              сохранённых данных. Оператор не управляет этим механизмом и не получает
              доступ к «заполнению» до отправки формы вами.
            </p>
            <p>
              Если в дальнейшем будут подключены системы аналитики (например,
              Яндекс.Метрика), обработка обезличенной статистики и cookie будет
              описана в этой Политике, а при необходимости — запрошено согласие.
            </p>
          </section>

          <section id="security" className="privacy__section">
            <h2>9. Защита данных</h2>
            <p>Оператор принимает разумные организационные и технические меры:</p>
            <ul>
              <li>передача форм по HTTPS;</li>
              <li>ограничение частоты запросов (rate limit) к API;</li>
              <li>проверка капчи при отправке форм;</li>
              <li>доступ к заявкам только у уполномоченных лиц;</li>
              <li>не храним данные платёжных карт на Сайте.</li>
            </ul>
            <p>
              Абсолютную безопасность данных в интернете гарантировать невозможно;
              при обнаружении инцидента мы примем меры по минимизации последствий.
            </p>
          </section>

          <section id="rights" className="privacy__section">
            <h2>10. Права пользователя</h2>
            <p>Вы вправе:</p>
            <ul>
              <li>получить информацию об обработке ваших ПДн;</li>
              <li>требовать уточнения, блокирования или удаления данных;</li>
              <li>отозвать согласие на обработку;</li>
              <li>
                обжаловать действия Оператора в Роскомнадзор или в суд.
              </li>
            </ul>
            <p>
              Запрос можно направить на email{' '}
              <a href={`mailto:${hotelEmail}`}>{hotelEmail}</a>{' '}
              с пометкой «Персональные данные». Мы ответим в сроки, установленные
              152‑ФЗ (как правило, до 30 дней).
            </p>
          </section>

          <section id="children" className="privacy__section">
            <h2>11. Данные несовершеннолетних</h2>
            <p>
              Сайт не предназначен для самостоятельного сбора данных детей. Если вы
              считаете, что мы получили данные ребёнка без согласия законного
              представителя, напишите нам — мы удалим такую информацию.
            </p>
          </section>

          <section id="changes" className="privacy__section">
            <h2>12. Изменение Политики</h2>
            <p>
              Мы можем обновлять текст Политики. Актуальная версия всегда доступна
              по адресу{' '}
              <Link href="/privacy">{SITE_URL.replace(/^https?:\/\//, '')}/privacy</Link>.
              Дата последнего обновления указана в начале страницы. Продолжение
              использования Сайта после изменений означает согласие с новой
              редакцией, если иное не требуется законом.
            </p>
          </section>

          <section id="privacy-contacts" className="privacy__section">
            <h2>13. Контакты по вопросам персональных данных</h2>
            <ul>
              <li>
                Email:{' '}
                <a href={`mailto:${hotelEmail}`}>{hotelEmail}</a>
              </li>
              <li>
                Телефон:{' '}
                <a href={phoneToTelHref(hotelPhone)}>{hotelPhone}</a>
              </li>
              <li>Адрес: {hotelAddress}</li>
            </ul>
            <p>
              По общим вопросам о проживании и бронировании также доступна страница{' '}
              <Link href="/#contacts">Контакты</Link>.
            </p>
          </section>
        </div>

        <footer className="privacy__footer">
          <Link href="/" className="privacy__back">
            ← На главную
          </Link>
          <Link href="/#contacts" className="privacy__back privacy__back--ghost">
            Контакты
          </Link>
        </footer>
      </div>
    </article>
  );
}