import { configDefaults, defineConfig } from 'vitest/config';
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
    // Claude Code worktrees live under .claude/worktrees/ inside the repo
    // itself; without this, a nested worktree's copy of this same test
    // suite gets picked up too, double-counting every test.
    exclude: [...configDefaults.exclude, '**/.claude/**'],
  },
});
