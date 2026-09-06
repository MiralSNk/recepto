import { NextResponse } from 'next/server';
import { getDB } from '@/db';
import { requireAdminSession, readJsonBody, serverError, revalidate } from '@/lib/server/api-helpers';

const MAX_VALUE_LENGTH = 2000;
// Длинные текстовые поля (абзацы контента) — им тесно в общем лимите.
const LONG_TEXT_KEYS = new Set(['footer_about', 'about_page_content']);
const MAX_LONG_TEXT_LENGTH = 8000;
const COORDINATE_KEYS = new Set(['hotel_lat', 'hotel_lon']);
// Номер счётчика Яндекс.Метрики — только цифры, пусто = счётчик не подключён.
const METRIKA_ID_KEY = 'yandex_metrika_id';

const SEO_KEYS = [
  'hotel_name',
  'hotel_address',
  'hotel_phone',
  'hotel_email',
  'hotel_rating',
  'hotel_lat',
  'hotel_lon',
  'social_vk',
  'social_telegram',
  'social_max',
  'site_title',
  'site_description',
  'footer_about',
  'footer_disclaimer',
  'chat_welcome_message',
  'about_page_content',
  'seo_home_title',
  'seo_home_description',
  'seo_contacts_title',
  'seo_contacts_description',
  'seo_privacy_title',
  'seo_privacy_description',
  'og_home_title',
  'og_home_description',
  'og_home_image',
  'og_contacts_title',
  'og_contacts_description',
  'og_contacts_image',
  'og_privacy_title',
  'og_privacy_description',
  'og_privacy_image',
  'yandex_webmaster_verification',
  'yandex_metrika_id',
];

const DESCRIPTIONS: Record<string, string> = {
  hotel_name: 'Название отеля. Показывается в шапке сайта, подвале и на страницах брони.',
  hotel_address: 'Адрес отеля. Показывается на карте, в контактах и в подвале сайта.',
  hotel_phone: 'Телефон для связи с гостями. Показывается в шапке, подвале и в формах брони.',
  hotel_email: 'Почта отеля для отображения на сайте (footer, контакты, чат). Заявки с сайта приходят на отдельный технический адрес (настройка MAIL_TO на сервере) — эта почта на их доставку не влияет.',
  hotel_rating: 'Звёздность отеля от 1 до 5 — используется поисковиками (Яндекс, Google) при показе сайта в результатах поиска.',
  hotel_lat: 'Широта — координата отеля на карте (можно узнать в Яндекс.Картах: кликните правой кнопкой по зданию — «Что здесь?»).',
  hotel_lon: 'Долгота — вторая координата отеля на карте (см. выше, как узнать).',
  social_vk: 'Ссылка на страницу ВКонтакте. Если оставить пустым, иконка ВКонтакте в подвале сайта просто не будет показываться.',
  social_telegram: 'Ссылка на Telegram-канал или чат. Если оставить пустым, иконка Telegram в подвале не показывается.',
  social_max: 'Ссылка на MAX (мессенджер). Если оставить пустым, иконка MAX в подвале не показывается.',
  site_title: 'Заголовок сайта по умолчанию — то, что видно на вкладке браузера, если у конкретной страницы нет своего заголовка.',
  site_description: 'Короткое описание сайта по умолчанию — используется поисковиками и при публикации ссылки на сайт в соцсетях.',
  footer_about: 'Текст «О гостинице» в самом низу сайта (подвал).',
  footer_disclaimer: 'Короткая юридическая приписка над копирайтом в подвале сайта.',
  chat_welcome_message: 'Первое сообщение, которое видит посетитель, открыв ИИ-чат-помощник на сайте.',
  about_page_content: 'Текст на странице «Об отеле». Каждый абзац пишите с новой строки — на сайте они разобьются на отдельные абзацы.',
  seo_home_title: 'Заголовок главной страницы для поисковиков (Яндекс, Google) — то, что видно крупным текстом в результатах поиска.',
  seo_home_description: 'Краткое описание главной страницы под заголовком в результатах поиска.',
  seo_contacts_title: 'Заголовок страницы «Об отеле» для поисковиков.',
  seo_contacts_description: 'Краткое описание страницы «Об отеле» для поисковиков.',
  seo_privacy_title: 'Заголовок страницы «Политика конфиденциальности» для поисковиков.',
  seo_privacy_description: 'Краткое описание страницы «Политика конфиденциальности» для поисковиков.',
  og_home_title: 'Заголовок карточки, которая появляется при вставке ссылки на главную страницу в мессенджерах и соцсетях (ВКонтакте, Telegram и т.д.).',
  og_home_description: 'Описание в той же карточке-превью для главной страницы.',
  og_home_image: 'Своя картинка для этой карточки-превью (ссылка на изображение). Пусто — картинка сгенерируется автоматически.',
  og_contacts_title: 'Заголовок карточки-превью при публикации ссылки на страницу «Об отеле».',
  og_contacts_description: 'Описание в карточке-превью для страницы «Об отеле».',
  og_contacts_image: 'Своя картинка для карточки-превью страницы «Об отеле». Пусто — сгенерируется автоматически.',
  og_privacy_title: 'Заголовок карточки-превью при публикации ссылки на страницу «Политика конфиденциальности».',
  og_privacy_description: 'Описание в карточке-превью для страницы «Политика конфиденциальности».',
  og_privacy_image: 'Своя картинка для карточки-превью страницы «Политика». Пусто — сгенерируется автоматически.',
  yandex_webmaster_verification: 'Код подтверждения сайта в Яндекс.Вебмастере (Вебмастер → Информация о сайте → «Мета-тег» — скопируйте только значение атрибута content, без самого тега).',
  yandex_metrika_id: 'Номер счётчика Яндекс.Метрики (только цифры). Пусто — счётчик не подключён.',
};

// Как и в /api/admin/pricing — незаполненное поле показывает разумный
// дефолт вместо пустой строки (админ его правит по вкусу, а не пишет с
// нуля). Раньше здесь дефолтов не было вовсе — footer_about/
// footer_disclaimer/about_page_content выглядели пустыми и «поломанными»
// на фоне остальной админки, где такой фолбэк уже привычен.
const DEFAULTS: Record<string, string> = {
  // Ровно те же значения, что реально используются как фолбэк в коде —
  // src/app/layout.tsx (site_title/site_description) и
  // src/components/ChatWidget/ChatMessages.tsx (chat_welcome_message) —
  // иначе поле в админке показывало бы не то, что реально видит гость.
  site_title: 'Название вашего отеля',
  site_description:
    'Уютный отель: комфортные номера и внимательный сервис. Бронирование онлайн.',
  chat_welcome_message:
    'Здравствуйте! Я помощник отеля.\nСпросите про номера, бронирование, как добраться или что рядом.',
  // Прежний захардкоженный <meta name="yandex-verification"> в layout.tsx —
  // тот же дефолт, чтобы подтверждение сайта не слетело сразу после деплоя.
  yandex_webmaster_verification: '0000000000000000',
  footer_about:
    'Наш отель предлагает гостям комфортные номера, внимательный персонал и продуманный сервис — для отдыха и деловых поездок.',
  footer_disclaimer:
    'Информация на сайте носит справочный характер и не является публичной офертой.',
  about_page_content:
    'Наш отель предлагает удобные номера различного класса, внимательный персонал и продуманный сервис — подходит как для отдыха, так и для деловых поездок.\n' +
    'Будем рады видеть вас у нас — забронируйте номер онлайн или свяжитесь с нами по телефону.',
};

export async function GET() {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  try {
    const db = getDB();
    const raw = await db.siteSettings.getSettings(SEO_KEYS);
    const result: Record<string, { value: string; description: string }> = {};

    for (const key of SEO_KEYS) {
      result[key] = {
        value: raw[key] || DEFAULTS[key] || '',
        description: DESCRIPTIONS[key] || '',
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    return serverError('GET seo settings error:', error);
  }
}

export async function PUT(req: Request) {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { data: body, error: bodyError } = await readJsonBody<Record<string, string>>(req);
  if (bodyError) return bodyError;

  const updates: Record<string, string> = {};
  for (const key of SEO_KEYS) {
    if (typeof body[key] === 'string') {
      const value = body[key].trim();
      const limit = LONG_TEXT_KEYS.has(key) ? MAX_LONG_TEXT_LENGTH : MAX_VALUE_LENGTH;
      if (value.length > limit) {
        return NextResponse.json({ error: `${key}: слишком длинное значение` }, { status: 400 });
      }
      if (COORDINATE_KEYS.has(key) && value && !/^-?\d{1,3}(\.\d+)?$/.test(value)) {
        return NextResponse.json({ error: `${key}: некорректные координаты` }, { status: 400 });
      }
      if (key === METRIKA_ID_KEY && value && !/^\d+$/.test(value)) {
        return NextResponse.json({ error: `${key}: номер счётчика — только цифры` }, { status: 400 });
      }
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 });
  }

  try {
    const db = getDB();
    for (const [key, value] of Object.entries(updates)) {
      await db.siteSettings.setSetting(key, value);
    }

    revalidate('seo', 'home');

    return NextResponse.json({ ok: true, message: 'Настройки SEO сохранены.' });
  } catch (error) {
    return serverError('PUT seo settings error:', error);
  }
}