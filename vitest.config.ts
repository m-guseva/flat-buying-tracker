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
    // Real-DB integration tests across different files can collide on shared
    // fixture data under Vitest's default per-file parallelism — e.g.
    // tests/ingestion/addApartment.test.ts and tests/ingestion/retryImport.test.ts
    // both create apartments using the same ImmoScout24 fixture's canonical
    // sourceUrl, so running them concurrently races app-level duplicate detection.
    fileParallelism: false,
  },
});
