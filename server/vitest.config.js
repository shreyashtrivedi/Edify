import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Fake key so AI code paths run; the Gemini SDK itself is mocked in tests.
    env: { NODE_ENV: 'test', GEMINI_API_KEY: 'test-key' },
    // Downloading the in-memory MongoDB binary the first time can be slow.
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});
