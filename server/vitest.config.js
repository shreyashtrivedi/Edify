import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Downloading the in-memory MongoDB binary the first time can be slow.
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});
