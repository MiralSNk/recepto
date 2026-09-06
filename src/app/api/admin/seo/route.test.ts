import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { createMockDB } from '@/test/mocks/db';
import { GET, PUT } from '@/app/api/admin/seo/route';

const SETTINGS_MAP: Record<string, string> = {
  hotel_name: 'Отель Тест',
  hotel_address: 'ул. Тестовая, 1',
  hotel_phone: '+7 900 000-00-00',
  hotel_email: 'test@example.com',
  seo_home_title: 'Title',
  seo_home_description: 'Desc',
};

const mockDB = createMockDB({
  siteSettings: {
    getSetting: vi.fn().mockImplementation(async (key: string) => SETTINGS_MAP[key] ?? ''),
    getSettings: vi.fn().mockImplementation(async (keys: string[]) => {
      const result: Record<string, string> = {};
      for (const key of keys) result[key] = SETTINGS_MAP[key] ?? '';
      return result;
    }),
    setSetting: vi.fn().mockResolvedValue(undefined),
  },
});

vi.mock('@/db', () => ({ getDB: () => mockDB }));

describe('/api/admin/seo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET 401 без сессии', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('GET 200 — ключи с value/description', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hotel_name?.value).toBe('Отель Тест');
    expect(typeof data.hotel_name?.description).toBe('string');
  });

  // Регрессия: footer_about/footer_disclaimer/about_page_content раньше не
  // имели дефолта (в отличие от остальной админки) и выглядели пустыми/
  // «поломанными», хотя ничего не сохранялось.
  it('GET 200 — footer_about/footer_disclaimer/about_page_content берут дефолт, если в БД пусто', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await GET();
    const data = await res.json();
    expect(data.footer_about?.value).toBeTruthy();
    expect(data.footer_disclaimer?.value).toBeTruthy();
    expect(data.about_page_content?.value).toBeTruthy();
  });

  // Регрессия: site_title/site_description/chat_welcome_message тоже не
  // имели дефолта — в отличие от остальной админки, поле выглядело пустым,
  // хотя на самом сайте (layout.tsx/ChatMessages.tsx) для этих же ключей
  // уже давно есть фолбэк — просто админка о нём не знала.
  it('GET 200 — site_title/site_description/chat_welcome_message берут тот же дефолт, что и сам сайт', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await GET();
    const data = await res.json();
    expect(data.site_title?.value).toBe('Название вашего отеля');
    expect(data.site_description?.value).toBeTruthy();
    expect(data.chat_welcome_message?.value).toContain('Здравствуйте');
  });

  it('GET 200 — yandex_webmaster_verification берёт прежний захардкоженный дефолт', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await GET();
    const data = await res.json();
    expect(data.yandex_webmaster_verification?.value).toBe('0000000000000000');
  });

  it('PUT 400 при нечисловом номере счётчика Яндекс.Метрики', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yandex_metrika_id: 'abc123' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('PUT 200 сохраняет корректный номер счётчика Яндекс.Метрики', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yandex_metrika_id: '12345678' }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockDB.siteSettings.setSetting).toHaveBeenCalledWith('yandex_metrika_id', '12345678');
  });

  it('PUT 400 без данных', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unknown_key: 'x' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('PUT 200 сохраняет hotel_name', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: {} } as never);
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotel_name: 'Новое имя' }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockDB.siteSettings.setSetting).toHaveBeenCalledWith(
      'hotel_name',
      'Новое имя'
    );
  });

  it('PUT 401', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotel_name: 'X' }),
      })
    );
    expect(res.status).toBe(401);
  });
});