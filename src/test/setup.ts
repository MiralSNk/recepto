import { vi } from 'vitest';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: (fn: (...args: any[]) => any) => fn,
}));

// next-auth (по умолчанию без сессии; в тестах переопределить)
vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));