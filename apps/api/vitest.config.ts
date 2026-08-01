import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@hevy/analytics': resolve(__dirname, '../../packages/analytics/src/index.ts'),
    },
  },
});
