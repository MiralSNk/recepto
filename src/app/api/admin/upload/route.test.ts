import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';

vi.mock('next-auth', async () => {
  const actual = await vi.importActual<typeof import('next-auth')>('next-auth');
  return { ...actual, getServerSession: vi.fn() };
});

let lastWrittenBuffer: Buffer | null = null;

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockImplementation((_path: string, data: Buffer) => {
    lastWrittenBuffer = data;
    return Promise.resolve();
  }),
  access: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ size: 1000 }),
}));

function svgFormData(svg: string, extra?: Record<string, string>) {
  const form = new FormData();
  const file = new File([svg], 'icon.svg', { type: 'image/svg+xml' });
  form.append('file', file);
  form.append('type', 'site');
  for (const [k, v] of Object.entries(extra ?? {})) form.append(k, v);
  return form;
}

describe('/api/admin/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastWrittenBuffer = null;
    vi.mocked(getServerSession).mockResolvedValue({ user: {} } as never);
  });

  it('401 без сессии', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const { POST } = await import('./route');
    const form = new FormData();
    const res = await POST(
      new Request('http://x', { method: 'POST', body: form })
    );
    expect(res.status).toBe(401);
  });

  it('SVG сохраняется как есть, если fixSvgColor не передан', async () => {
    const { POST } = await import('./route');
    const svg = '<svg><path fill="#111111" d="a"/></svg>';
    const res = await POST(
      new Request('http://x', { method: 'POST', body: svgFormData(svg) })
    );
    expect(res.status).toBe(200);
    expect(lastWrittenBuffer?.toString('utf-8')).toBe(svg);
  });

  it('SVG получает currentColor вместо захардкоженного fill при fixSvgColor=true', async () => {
    const { POST } = await import('./route');
    const svg = '<svg><path fill="#111111" d="a"/></svg>';
    const res = await POST(
      new Request('http://x', {
        method: 'POST',
        body: svgFormData(svg, { fixSvgColor: 'true' }),
      })
    );
    expect(res.status).toBe(200);
    expect(lastWrittenBuffer?.toString('utf-8')).toBe('<svg><path fill="currentColor" d="a"/></svg>');
  });

  // Регрессия: SVG теперь показывается на сайте инлайном (не через <img>,
  // иначе currentColor не работает) — значит его содержимое обязано быть
  // очищено от потенциально исполняемого кода ВСЕГДА, а не только при
  // включённой галочке "исправить цвет".
  it('SVG со <script> зачищается при загрузке независимо от fixSvgColor', async () => {
    const { POST } = await import('./route');
    const svg = '<svg><script>alert(1)</script><path fill="#111" d="a"/></svg>';
    const res = await POST(
      new Request('http://x', { method: 'POST', body: svgFormData(svg) })
    );
    expect(res.status).toBe(200);
    expect(lastWrittenBuffer?.toString('utf-8')).not.toMatch(/script/i);
    expect(lastWrittenBuffer?.toString('utf-8')).toContain('fill="#111"');
  });

  it('fixSvgColor=true не трогает fill="none"', async () => {
    const { POST } = await import('./route');
    const svg = '<svg><path fill="none" stroke="#000" d="a"/></svg>';
    const res = await POST(
      new Request('http://x', {
        method: 'POST',
        body: svgFormData(svg, { fixSvgColor: 'true' }),
      })
    );
    expect(res.status).toBe(200);
    expect(lastWrittenBuffer?.toString('utf-8')).toBe(svg);
  });
});
