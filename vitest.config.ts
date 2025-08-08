import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: [],
    css: false,
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});


