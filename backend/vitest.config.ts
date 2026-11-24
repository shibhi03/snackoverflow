import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false, // Run test suites sequentially against the test database
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
