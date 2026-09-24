import { defineConfig } from 'vitest/config';

/**
 * Server test configuration. Node environment, single-run friendly (see the
 * `test` script). Tests are co-located as `*.test.ts` next to the code under
 * test.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
