import { defineConfig } from 'vitest/config';
import path from 'path';
import svgr from 'vite-plugin-svgr';

const alias = {
  '@': path.resolve(__dirname, 'src'),
  'server-only': path.resolve(__dirname, 'src/test/server-only-mock.ts'),
};

// Дефолтные 5000ms иногда не хватает при полном прогоне (много файлов
// параллельно) на слабой машине — отдельные тесты ложно падали по таймауту
// при полном прогоне, хотя проходили мгновенно в изоляции.
const testTimeout = 15000;

export default defineConfig({
  resolve: { alias },
  test: {
    globals: false,
    clearMocks: true,
    restoreMocks: true,
    testTimeout,
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['node_modules', '.next', 'dist', 'src/**/*.integration.test.ts'],
          setupFiles: ['./src/test/setup.ts'],
          globals: false,
          clearMocks: true,
          restoreMocks: true,
          testTimeout,
        },
      },
      {
        resolve: { alias },
        // svgr — импорт *.svg как React-компонента, как это делает @svgr/webpack
        // в реальной сборке Next.js; без плагина Vite отдаёт голую URL-строку,
        // и `<Icon />` падает с InvalidCharacterError.
        plugins: [svgr({ include: '**/*.svg' })],
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          exclude: ['node_modules', '.next', 'dist'],
          setupFiles: ['./src/test/setup.ts', './src/test/setup-dom.ts'],
          globals: false,
          clearMocks: true,
          restoreMocks: true,
          testTimeout,
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'integration',
          environment: 'node',
          // Настоящая MySQL (docker-compose, см. package.json → test:integration),
          // а не моки — намеренно не входит в обычный `pnpm test`.
          include: ['src/**/*.integration.test.ts'],
          exclude: ['node_modules', '.next', 'dist'],
          testTimeout: 20000,
          globals: false,
        },
      },
    ],
  },
});
