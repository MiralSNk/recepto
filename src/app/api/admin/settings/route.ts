import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import { getDB } from '@/db';
import { requireAdminSession, readJsonBody, serverError } from '@/lib/server/api-helpers';

// Редактируемые (несекретные) переменные
const EDITABLE_KEYS = [
  'NEXT_PUBLIC_SITE_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'MAIL_FROM',
  'MAIL_TO',
  'ADMIN_EMAIL',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_NAME',
];

// Секретные переменные (могут меняться, но скрыты). Пароль для входа в
// админку живёт в БД (users.password_hash) и меняется через отдельный
// эндпоинт /api/admin/change-password — здесь его больше нет, т.к. правка
// ADMIN_PASSWORD в .env раньше ничего не меняла в реальной аутентификации.
const SECRET_KEYS = [
  'YANDEX_API_KEY',
  'YANDEX_FOLDER_ID',
  'YANDEX_CAPTCHA_SERVERKEY',
  'NEXT_PUBLIC_YANDEX_CAPTCHA_SITEKEY',
  'SMTP_PASS',
  'NEXTAUTH_SECRET',
  'DB_PASSWORD',
];

const ALL_KEYS = [...EDITABLE_KEYS, ...SECRET_KEYS];

const DESCRIPTIONS: Record<string, string> = {
  NEXT_PUBLIC_SITE_URL: 'Публичный URL сайта (например, https://domain.ru)',
  SMTP_HOST: 'SMTP-сервер (например, smtp.yandex.ru)',
  SMTP_PORT: 'Порт SMTP (обычно 465 для SSL)',
  SMTP_USER: 'Логин от почты (email)',
  SMTP_PASS: 'Пароль от почты (для отправки писем)',
  MAIL_FROM: 'Отправитель писем (формат: Имя <email>)',
  MAIL_TO: 'Email для приёма заявок',
  ADMIN_EMAIL: 'Email администратора (для входа в админку)',
  DB_HOST: 'Хост базы данных (обычно localhost)',
  DB_PORT: 'Порт базы данных (3306)',
  DB_USER: 'Пользователь базы данных',
  DB_PASSWORD: 'Пароль пользователя базы данных',
  DB_NAME: 'Имя базы данных',
  YANDEX_API_KEY: 'API-ключ Yandex GPT',
  YANDEX_FOLDER_ID: 'Folder ID Yandex Cloud',
  NEXT_PUBLIC_YANDEX_CAPTCHA_SITEKEY: 'Публичный ключ Yandex SmartCaptcha',
  YANDEX_CAPTCHA_SERVERKEY: 'Серверный ключ Yandex SmartCaptcha',
  NEXTAUTH_SECRET: 'Секрет для NextAuth (любая длинная строка)',
};

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    result[key] = value.replace(/^["']|["']$/g, '');
  }
  return result;
}

function serializeEnvFile(env: Record<string, string>): string {
  return Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

export async function GET() {
  const { error: authError } = await requireAdminSession();
  if (authError) return authError;

  try {
    const envPath = path.join(process.cwd(), '.env.production');
    const raw = await fs.readFile(envPath, 'utf-8');
    const env = parseEnvFile(raw);

    const result: Record<string, { value: string; editable: boolean; secret: boolean; description: string }> = {};

    for (const key of ALL_KEYS) {
      const value = env[key] || '';
      const isSecret = SECRET_KEYS.includes(key);
      const isEditable = EDITABLE_KEYS.includes(key);
      result[key] = {
        value: isSecret ? '' : value, // секреты не отдаём, только пустую строку
        editable: isEditable,
        secret: isSecret,
        description: DESCRIPTIONS[key] || key,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    return serverError('GET settings error:', error);
  }
}

export async function PUT(req: Request) {
  const { session, error: authError } = await requireAdminSession();
  if (authError) return authError;

  const { data: body, error: bodyError } = await readJsonBody<Record<string, string>>(req);
  if (bodyError) return bodyError;

  const updates: Record<string, string> = {};

  // Обрабатываем обычные редактируемые поля
  for (const key of EDITABLE_KEYS) {
    if (typeof body[key] === 'string' && body[key].trim()) {
      updates[key] = body[key].trim();
    }
  }

  // Обрабатываем секретные поля: обновляем только если передано непустое значение и не маска
  for (const key of SECRET_KEYS) {
    const val = body[key];
    if (typeof val === 'string' && val.trim() && val !== '••••••••') {
      updates[key] = val.trim();
    }
  }

  const changingSecrets = SECRET_KEYS.some((key) => key in updates);
  if (changingSecrets) {
    // Изменение секретов (пароль БД, ключи API, NEXTAUTH_SECRET и т.п.) требует
    // повторного ввода текущего пароля админа — угнанной сессии одной этой
    // проверки недостаточно, чтобы молча переписать боевые секреты.
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    if (!currentPassword) {
      return NextResponse.json(
        { error: 'Для изменения секретных значений введите текущий пароль' },
        { status: 400 }
      );
    }
    const user = await getDB().users.findByEmail(session!.user.email);
    const isValid = user && (await bcrypt.compare(currentPassword, user.password_hash));
    if (!isValid) {
      return NextResponse.json({ error: 'Текущий пароль неверен' }, { status: 400 });
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 });
  }

  try {
    // Файлы, которые нужно обновить
    const filesToUpdate = ['.env.production', '.env.local'];

    for (const fileName of filesToUpdate) {
      const envPath = path.join(process.cwd(), fileName);
      try {
        const raw = await fs.readFile(envPath, 'utf-8');
        const env = parseEnvFile(raw);

        for (const [key, value] of Object.entries(updates)) {
          env[key] = value;
        }

        await fs.writeFile(envPath, serializeEnvFile(env), 'utf-8');
      } catch (err) {
        console.warn(`Не удалось обновить ${fileName}:`, err);
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Настройки сохранены. Перезапустите приложение (pm2 restart recepto), чтобы изменения вступили в силу.',
    });
  } catch (error) {
    return serverError('PUT settings error:', error);
  }
}