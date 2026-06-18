import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    server: {
      deps: {
        inline: ['@vitejs/plugin-rsc'],
      },
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.d.ts',
        'src/solas.d.ts',
        'src/types.ts',
        'src/index.ts',
        'src/adapters/**',
      ],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        lines: 60,
        functions: 50,
        branches: 50,
        statements: 60,
      },
    },
  },
})
