import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

// Tests must never touch the dev database or dev file storage (see .env vs
// .env.test) — load the test-only env file instead of the default .env.
dotenv.config({ path: '.env.test' });

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    environment: 'node',
  },
});
