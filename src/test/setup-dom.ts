import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// globals: false в vitest.config.ts — RTL не находит globalThis.afterEach
// сама, поэтому unmount между тестами регистрируем явно (иначе компоненты
// из предыдущих тестов остаются в document.body и ломают screen-запросы).
afterEach(() => {
  cleanup();
});
