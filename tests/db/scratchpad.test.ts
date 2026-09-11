import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '@/lib/db/client';
import { getScratchpad, saveScratchpad } from '@/lib/db/scratchpad';

afterEach(async () => {
  await prisma.scratchpad.deleteMany();
});

describe('scratchpad repository', () => {
  it('returns an empty string when nothing has been saved yet', async () => {
    expect(await getScratchpad()).toBe('');
  });

  it('saves and reads back content', async () => {
    await saveScratchpad('https://example.com/listing-1');

    expect(await getScratchpad()).toBe('https://example.com/listing-1');
  });

  it('overwrites previous content on repeated saves, not appends', async () => {
    await saveScratchpad('first');
    await saveScratchpad('second');

    expect(await getScratchpad()).toBe('second');
  });
});
